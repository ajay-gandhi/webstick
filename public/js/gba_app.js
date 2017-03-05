var gba;
var runCommands = [];
var PAUSED = false;

try {
  gba = new GameBoyAdvance();
  gba.keypad.eatInput = true;
  gba.setLogger(function (error) {
    console.log(error);
    gba.pause();
    var screen = document.getElementById('screen');
    if (screen.getAttribute('class') == 'dead') {
      console.log('We appear to have crashed multiple times without reseting.');
      return;
    }
    var crash = document.createElement('img');
    crash.setAttribute('id', 'crash');
    crash.setAttribute('src', 'resources/crash.png');
    screen.parentElement.insertBefore(crash, screen);
    screen.setAttribute('class', 'dead');
  });
} catch (exception) {
  gba = null;
}

var CURRENT_ROM;

$(document).on('fully_ready', function () {
  window.addEventListener("orientationchange", update_canvas_size, false);
  update_canvas_size();

  if (gba && FileReader) {
    gba.setCanvas(document.getElementById('screen'));

    gba.logLevel = gba.LOG_ERROR;
    // report fps
    // gba.reportFPS = function (fps) {
    //   var counter = document.getElementById('fps');
    //   counter.textContent = Math.floor(fps);
    // };

    loadFile('gbajs/assets/bios.bin', function (bios) {
      gba.setBios(bios);
    });

    if (!gba.audio.context) {
      // Remove the sound box if sound isn't available
      $('#sound').remove();
    }

    if (window.navigator.appName == 'Microsoft Internet Explorer') {
      // Remove the pixelated option if it doesn't work
      $('#pixelated').remove();
    }

    // Parse querystring
    var qs = window.location.search.substring(1).split('&');
    CURRENT_ROM = decodeURIComponent(qs.shift().split('=').pop());
    $('title').text($('title').text() + ' | ' + CURRENT_ROM);

    if (qs.length) {

      // Load savegame, then rom
      var save = qs.shift().split('=').pop();
      $('#menu #save-name').val(save);
      var is_local = qs.shift().split('=').pop() === 'true';
      if (is_local) {
        // Load from localStorage
        runCommands.push(function () {
          gba.loadLocal(CURRENT_ROM, save);
        });
        start_game(CURRENT_ROM);

      } else {
        // Get from server
        $.ajax({
          url: 'getSaveData',
          data: {
            'save_name': save,
            'rom_name': CURRENT_ROM
          }
        })
        .done(function (savedata) {
          if (!savedata) {
            // Invalid save
            start_game(CURRENT_ROM);

          } else {
            runCommands.push(function () {
              gba.decodeBase64(savedata);
            });

            // Load rom
            start_game(CURRENT_ROM);
          }
        });
      }
    } else {
      // Just load rom
      start_game(CURRENT_ROM);
    }
  } else {
    console.error('GBA failed.');
  }

  // Menu events
  $('#menu-open').click(function () {
    gba.pause();
    PAUSED = true;
    $('<div class="cover" id="cover-dark"></div>')
      .appendTo('body')
      .fadeTo(400, 0.90);
    $('#menu').fadeIn(400);
  });
  $('#menu #close').click(function () {
    $('#cover-dark').fadeTo(400, 0, 'swing', function () {
      $(this).remove();
    });
    $('#menu').fadeOut(300);
    setTimeout(function () {
      gba.runStable();
      PAUSED = false;
    }, 500);
  });

  var save_type_fadeout = null;
  $('#save-interface #offline-save').change(function () {
    var is_offline = $(this).is(':checked');
    window.clearTimeout(save_type_fadeout);
    $('#save-interface #save-type')
      .stop()
      .text(is_offline ? 'Save offline' : 'Save online')
      .fadeIn('normal', function () {
        save_type_fadeout = setTimeout(function () {
          $('#save-interface #save-type').fadeOut();
        }, 1200);
      });
  });

  $('#save-interface #create-save').click(function () {
    $(this).prop('disabled', 'true');

    // Validate name
    var save_name = $('#save-interface #save-name').val();
    if (!/^[a-zA-Z0-9_-]*$/.test(save_name)) {
      display_save_status('Only alphanumeric and -_ allowed.', false);
      return;
    }

    var save_offline = $('#save-interface #offline-save').is(':checked');
    if (save_offline) {
      // Save in localStorage
      if (localStorage_avail()) {
        var succeeded = gba.saveLocal(CURRENT_ROM, save_name);
        var msg = succeeded ? 'Game saved!' : 'Game failed to save.';
        display_save_status(msg, succeeded);

      } else {
        // Display fail
        display_save_status('Local save not supported.', false);
      }

    } else {
      var savedata = gba.getSavedata();

      var page_size = 4000;
      var split_savedata = [];
      while (savedata.length > page_size) {
        var part = savedata.substr(0, page_size);
        savedata = savedata.substr(page_size);
        split_savedata.push(part);
      }
      split_savedata.push(savedata);

      // Save to server
      var send_next_piece = function (data, page) {
        $.ajax({
          url: 'createSave',
          data: {
            'save_name': save_name,
            'save_data': data[page],
            'page': page,
            'total_pages': data.length,
            'rom_name': CURRENT_ROM
          }
        })
        .done(function (succeeded) {
          if (page == data.length - 1) {
            // Sent all pieces
            var msg = succeeded ? 'Game saved!' : 'Game failed to save.';
            display_save_status(msg, succeeded);

          } else {
            send_next_piece(data, page + 1);
          }
        });
      }
      send_next_piece(split_savedata, 0);
    }
  });

  $('#menu #back-to-browse').click(function () {
    $('<div class="cover" id="cover-light"></div>')
      .appendTo('body')
      .fadeIn('fast', function () {
        window.location = 'browse.html';
      });
  });

  // Submit on enter for input
  $('input').keypress(function (e) {
    if (e.which == 13) {
      $('#save-interface #create-save').click();
      return false;
    }
  });
});

function run(file) {
  var dead = document.getElementById('loader');
  dead.value = '';
  var load = document.getElementById('select');
  load.textContent = 'Loading...';
  load.removeAttribute('onclick');
  var pause = document.getElementById('pause');
  pause.textContent = "PAUSE";
  gba.loadRomFromFile(file, function (result) {
    if (result) {
      for (var i = 0; i < runCommands.length; ++i) {
        runCommands[i]();
      }
      runCommands = [];
      gba.runStable();
    } else {
      load.textContent = 'FAILED';
      setTimeout(function () {
        load.textContent = 'SELECT';
        load.onclick = function () {
          document.getElementById('loader').click();
        }
      }, 3000);
    }
  });
}

function reset() {
  gba.pause();
  gba.reset();
  var load = document.getElementById('select');
  load.textContent = 'SELECT';
  var crash = document.getElementById('crash');
  if (crash) {
    var context = gba.targetCanvas.getContext('2d');
    context.clearRect(0, 0, 480, 320);
    gba.video.drawCallback();
    crash.parentElement.removeChild(crash);
    var canvas = document.getElementById('screen');
    canvas.removeAttribute('class');
  } else {
    lcdFade(gba.context, gba.targetCanvas.getContext('2d'), gba.video.drawCallback);
  }
  load.onclick = function () {
    document.getElementById('loader').click();
  }
}

function screenshot() {
  var canvas = gba.indirectCanvas;
  window.open(canvas.toDataURL('image/png'), 'screenshot');
}

function lcdFade(context, target, callback) {
  var i = 0;
  var drawInterval = setInterval(function () {
    i++;
    var pixelData = context.getImageData(0, 0, 240, 160);
    for (var y = 0; y < 160; ++y) {
      for (var x = 0; x < 240; ++x) {
        var xDiff = Math.abs(x - 120);
        var yDiff = Math.abs(y - 80) * 0.8;
        var xFactor = (120 - i - xDiff) / 120;
        var yFactor = (80 - i - ((y & 1) * 10) - yDiff + Math.pow(xDiff, 1 / 2)) / 80;
        pixelData.data[(x + y * 240) * 4 + 3] *= Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
      }
    }
    context.putImageData(pixelData, 0, 0);
    target.clearRect(0, 0, 480, 320);
    if (i > 40) {
      clearInterval(drawInterval);
    } else {
      callback();
    }
  }, 50);
}

function setVolume(value) {
  gba.audio.masterVolume = Math.pow(2, value) - 1;
}

function setPixelated(pixelated) {
  var screen = document.getElementById('screen');
  var context = screen.getContext('2d');
  if (context.webkitImageSmoothingEnabled) {
    context.webkitImageSmoothingEnabled = !pixelated;
  } else if (context.mozImageSmoothingEnabled) {
    context.mozImageSmoothingEnabled = !pixelated;
  } else if (window.navigator.appName != 'Microsoft Internet Explorer') {
      if (pixelated) {
        screen.setAttribute('width', '240');
        screen.setAttribute('height', '160');
      } else {
        screen.setAttribute('width', '480');
        screen.setAttribute('height', '320');
      }
      if (window.navigator.appName == 'Opera') {
      // Ugly hack! Ew!
      if (pixelated) {
        screen.style.marginTop = '0';
        screen.style.marginBottom = '-325px';
      } else {
        delete screen.style;
      }
    }
  }
}

/**
 * Starts the game with the given rom
 */
var start_game = function (game_name) {
  $.ajax({
    url: 'getRom',
    data: { 'rom_name': CURRENT_ROM }
  })
  .done(function (b64e_rom) {
    $('#screen-cover').remove();
    rom = base64_decode(b64e_rom);
    gba.setRom(rom);
    for (var i = 0; i < runCommands.length; ++i) {
      runCommands[i]();
    }
    runCommands = [];
    if (!PAUSED) gba.runStable();
  });
}

function base64_decode(base64) {
  var binary_string = window.atob(base64);
  var bytes = new Uint8Array(new ArrayBuffer(binary_string.length));
  for (var i = 0; i < binary_string.length; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Returns true if localStorage is available, otherwise false
 */
var localStorage_avail = function () {
  try {
    var storage = window['localStorage'],
        x       = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Display a status message over the input and button in the menu
 */
var display_save_status = function (msg, successful) {
  if (successful) {
    $('#save-interface #save-status')
      .removeClass('failure')
      .addClass('success')
      .text(msg);
  } else {
    $('#save-interface #save-status')
      .removeClass('success')
      .addClass('failure')
      .text(msg);
  }

  $('#save-interface #save-status').fadeIn();
  setTimeout(function () {
    $('#save-interface #create-save').removeAttr('disabled');
    $('#save-interface #save-status').fadeOut();
  }, 2000);
}

/**
 * Conducts AJAX request to get the file
 */
function loadFile(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function () { callback(xhr.response) };
  xhr.send();
}

/**
 * Sets canvas size and position based on window size
 */
var update_canvas_size = function () {
  // Make canvas as big as possible
  var ratio = 1.5; // = width / height
  if ($(window).width() > $(window).height()) {
    $('#orientation').removeClass('portrait').addClass('landscape');
    var w = $(window).width() - 350;
    var h = ($(window).width() - 350) / ratio;
    if (h > $(window).height()) {
      h = $(window).height();
      w = h * ratio;
    }
    var marginTop = ($(window).height() - h) / 2;
    $('canvas').attr('width', w);
    $('canvas').attr('height', h);
    $('canvas').css('marginTop', marginTop);
    $('.landscape #controls').css('top', ($(window).height() - 350) / 2 + 'px');
  } else {
    $('#orientation').removeClass('landscape').addClass('portrait');
    $('canvas').attr('width', $(window).width());
    $('canvas').attr('height', $(window).width() / ratio);
  }
}
