/**
 * https://github.com/justspamjustin/PhantomStig
 * PhantomStig v 0.1.1
 */

/*global console:true, module:true, document:true, $:true */
(function () {
  'use strict';
  var phantom = require('node-phantom');
  var _ = require('underscore');

  var waitForElementTimeout = 10000;
  var waitForInterval = 50;

  var defaultOptions = {};

  var PhantomStig = function (options) {
    this.options = _.defaults(options, defaultOptions);
    this.steps = [];
    this.page = null;
    this.phantom = null;
    this.timeout = waitForElementTimeout;
    this.buildSteps();
  };

  PhantomStig.prototype = {

    buildSteps: function () {
      var _this = this;
      _(_.keys(this.actions)).each(function (key) {
        _this[key] = function () {
          this.steps.push({
            fn: key,
            args: _.toArray(arguments)
          });
        };
      });
    },

    run: function (doneCallback) {
      var self = this;
      this._runRecursive(function () {
        self.phantom.exit();
        if (doneCallback) {
          doneCallback();
        }
      });
    },

    _runRecursive: function (doneCallback) {
      if (this.steps.length > 0) {
        var step = this._popFrontStep();
        var self = this;
        step.args.push(function () {
          self._runRecursive(doneCallback);
        });
        this.actions[step.fn].apply(this, step.args);
      } else {
        doneCallback();
      }
    },

    _popFrontStep: function () {
      return this.steps.splice(0, 1)[0];
    },

    actions: {
      open: function (url, done) {
        var self = this;
        phantom.create(function (err, ph) {
          ph.createPage(function (err, page) {
            self.phantom = ph;
            page.onConsoleMessage = function() {
              console.log('console:');
              console.log(arguments);
            };
            page.open(url, function (err, status) {
              if (status === 'success') {
                self.page = page;
                done();
              } else {
                self.error('The page: ' + url + ' was not loaded');
              }
            });
          });
        }, this.options);
      },
      waitForElement: function (cssSelector, done) {
        this._waitForElementToExist(cssSelector, done);
      },
      setElementValue: function (cssSelector, value, done) {
        this.page.evaluate(function (cssSelector, value) {
          document.querySelector(cssSelector).value = value;
        }, done, cssSelector, value);
      },
      submitForm: function (cssSelector, done) {
        this.page.evaluate(function (cssSelector) {
          document.querySelector(cssSelector).submit();
        }, done, cssSelector);
      },
      clickElement: function (cssSelector, done) {
        this.page.evaluate(function (cssSelector) {
          var ev = document.createEvent('MouseEvent');
          ev.initMouseEvent(
            'click',
            true /* bubble */, true /* cancelable */,
            window, null,
            0, 0, 0, 0, /* coordinates */
            false, false, false, false, /* modifier keys */
            0 /*left*/, null
          );
          var el = document.querySelector(cssSelector);
          el.dispatchEvent(ev);
        }, done, cssSelector);
      },
      getCookie: function (doneCallback, done) {
        this.page.evaluate(function () {
          return document.cookie;
        }, function (err, cookie) {
          doneCallback(cookie);
          done();
        });
      },
      getText: function (cssSelector, doneCallback, done) {
        this.page.evaluate(function (cssSelector) {
          return document.querySelector(cssSelector).innerText;
        }, function (err, text) {
          doneCallback(text);
          done();
        }, cssSelector);
      }
    },

    _waitForElementToExist: function (cssSelector, done) {
      this._waitForElementToExistRecursive(cssSelector, this.timeout, done);
    },

    _waitForElementToExistRecursive: function (cssSelector, timeLeft, done) {
      var self = this;
      if (timeLeft > 0) {
        timeLeft -= waitForInterval;
        this._doesElementExist(cssSelector, function (exists) {
          if (exists) {
            done();
          } else {
            _.delay(function () {
              self._waitForElementToExistRecursive(cssSelector, timeLeft, done);
            }, waitForInterval);
          }
        });
      } else {
        this.error('Timeout while waiting for element ' + cssSelector);
      }
    },

    _doesElementExist: function (cssSelector, done) {
      var self = this;
      this.page.evaluate(function (cssSelector) {
        return document.querySelector(cssSelector);
      }, function (err, result) {
        if (err) {
          self.error(err);
        }
        result ? done(true) : done(false);
      }, cssSelector);

    },

    error: function (msg) {
      console.log(msg);
      this.phantom.exit();
      throw new Error('There was an error!');
    }
  };

  module.exports = PhantomStig;
})();

