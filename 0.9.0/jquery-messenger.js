(function () {
    if (!window.Messenger) {
        window.Messenger = {};
    }
})();

Messenger = (function ($) {
    'use strict';

    var self = Messenger,
        settings = {
            notify: true,
            notifyIconUrl: '..',
            closable: true,
            handle: true,
            popupMode: true,
            popupSize: 5,
            layout: 'top-center',
            target: 'body',
            width: 800,
            timeout: 0,
            cacheSize: 1000,
            pageSize: 5,
            autoUpload: false,
            uploadUrl: 'messenger_log',
            uploadType: {
                info: true,
                success: true,
                warning: true,
                error: true
            },
            messageTime: true,
            messageIcon: true,
            drawer: true,
            onCreated: function (message) {
            },
            onUploaded: function (message, data) {
            },
            onClosed: function (message, event) {
            }
        },
        /**
         * Layout class prefix string.
         * @type {string}
         */
            layoutPrefix = 'c-msg-layout-',
        /**
         * Current layout string tag.
         * @type {string}
         */
            curLayout = 'top-center',
        /**
         * true - Messenger is at the top of the page, false - at Messenger is at the bottom of the page.
         * @type {boolean}
         */
            isBottomLayout = false,
        /**
         * A tag for popup mode or management mode.
         * true  - Default is popup mode or after close message console.
         * false - Message Console opened.
         * @type {boolean}
         */
            isPopup = true,
        /**
         * Messenger freeze tag
         * @type {boolean}
         */
            isFreeze = false,
        /**
         * Paging index tag.
         * @type {number}
         */
            nextPageIndex = 0,
        /**
         * Messenger jQuery object.
         */
            wMessenger,
        /**
         * Tool bar jQuery object.
         */
            wToolBar,
        /**
         * Messenger body jQuery object.
         */
            wMessageBody,
        /**
         * Handler bar jQuery object.
         */
            wHandlerBar,
        /**
         * Paging jQuery object.
         */
            wPaginate,
        /**
         * Cache timeout ticks.
         * @type {{}}
         */
            ticks = {},
        /**
         * Message mid cache.
         * @type {Array}
         */
            msgIndex = [],
        /**
         * Message object cache.
         * @type {{}}
         */
            msgCache = {},
        /**
         * A tag for browser active.
         * @type {boolean}
         */
            isInactivated = false,
        /**
         * A tag for Notification permission.
         * @type {boolean}
         */
            isPermission = false,
        /**
         * Desktop Notification Class.
         * @type {*}
         */
            Notification = window['Notification'] || window['webkitNotification'] || window['mozNotification'] || window['msNotification'],
        /**
         * Message types.
         * @type {{info: string, success: string, warning: string, error: string}}
         */
            MESSAGE_TYPE = {
            info: 'info',
            success: 'success',
            warning: 'warning',
            error: 'error'
        },
        /**
         * Message css icon classes.
         * @type {{info: string, error: string, warning: string, success: string}}
         */
            MESSAGE_TYPE_ICON = {
            info: 'c-icon-info',
            error: 'c-icon-error',
            warning: 'c-icon-warning',
            success: 'c-icon-success'
        },
        /**
         * Message button types.
         * @type {{remove: string, close: string}}
         */
            MESSAGE_ACTION = {
            remove: 'remove',
            close: 'close'
        },
        /**
         * Message button css icon classes.
         * @type {{remove: string, close: string}}
         */
            MESSAGE_ACTION_ICON = {
            remove: 'c-icon-remove',
            close: 'c-icon-cancel-circle'
        },
        /**
         * KeyCode
         * @type {{left: number, right: number, home: number, end: number, pageUp: number, pageDown: number}}
         */
            KEY_CODE = {
            left: 37,
            up: 38,
            right: 39,
            down: 40
        },
        /**
         *
         * @param {function} callback
         * @param {number} delay
         * @private
         */
            Timeout = function (callback, delay) {
            var tick, start, remaining = delay;

            this.freeze = function () {
                clearTimeout(tick);
                remaining -= new Date() - start;
            };

            this.resume = function () {
                start = new Date();
                clearTimeout(tick);
                tick = setTimeout(callback, remaining);
            };

            this.getTick = function () {
                return tick;
            };

            this.resume();
        },
        _ = {
            /**
             * init plugin basic params.
             * @returns {_}
             */
            init: function () {
                _.initI18n().requestPermission().registerVisibility();

                //init messenger wrapper.
                if (!wMessenger) {
                    _.render.initDefaultUI();
                    _.togglePopupAndConsole();
                }

                return this;
            },
            /**
             * Get i18n string by key.
             * @param {string} key
             * @returns {string}
             */
            i18n: function (key) {
                return $.isPlainObject(self.i18n) ? self.i18n[key] || '' : '';
            },
            /**
             * Init internationalization lang file.
             * Default lang is en, so we need not to define a en.js file.
             * @returns {_}
             */
            initI18n: function () {
                var i18n = {
                    title: 'Message Console',
                    no_msg: 'No Message',
                    total: 'Total:',
                    close: 'Close',
                    prev: 'Previous(Ctrl+shift+left)',
                    next: 'Next(Ctrl+shift+right)',
                    remove: 'Remove a Message?',
                    remove_all: 'Remove all Messages?',
                    cancel: 'Close Message',
                    stat: 'Message Statistics',
                    list: 'Message List',
                    open: 'Open Message Console'
                };

                $.isPlainObject(self.i18n) ? $.extend(false, self.i18n, i18n) : self.i18n = i18n;

                return this;
            },
            /**
             * Count current message item length.
             * @returns {Number}
             */
            getCurItemSize: function () {
                return wMessageBody ? wMessageBody.find('.c-msg-item').length : 0;
            },
            /**
             Covert jQuery object to DOM.
             * @param {$|jQuery} jQueryObj
             * @returns {string|outerHTML|*}
             */
            jQuery2DOM: function (jQueryObj) {
                return jQueryObj && jQueryObj.jquery ? jQueryObj[0].outerHTML : '';
            },
            /**
             * Clear message timeout one by one.
             */
            clearTimeoutQueue: function () {
                for (var mid in ticks) {
                    if (ticks.hasOwnProperty(mid)) {
                        clearTimeout(ticks[mid].getTick());
                        delete ticks[mid];
                    }
                }
            },
            /**
             * Freeze or resume timeout.
             * @param {boolean} isFrozen
             */
            toggleTicks: function (isFrozen) {
                for (var mid in ticks) {
                    if (ticks.hasOwnProperty(mid)) {
                        var tick = ticks[mid];
                        isFrozen ? tick.freeze() : tick.resume();
                    }
                }
            },
            /**
             * Remove message from cache.
             * @param {string} mid
             * @returns {number}
             */
            cacheRemove: function (mid) {
                delete msgCache[mid];

                for (var i = 0, size = msgIndex.length; i < size; i++) {
                    if (msgIndex[i] === mid) {
                        msgIndex.splice(i, 1);
                        return i;
                    }
                }
                return 0;
            },
            /**
             * Clear all cached data.
             */
            cacheRemoveAll: function () {
                msgCache = {};
                msgIndex = [];
                ticks = {};
                nextPageIndex = 0;
                wMessageBody.html('<span class="c-msg-empty">' + _.i18n('no_msg') + '</span>');
                $('.c-msg-start-index, .c-msg-end-index, .c-msg-item-amount', wMessenger).html('');
            },
            /**
             * Calculate page starting index by any index.
             * @param {number} index cached data index.
             * @returns {number}
             */
            getPageStartIndex: function (index) {
                var pageSize = settings.pageSize;
                return Math.floor((index < 0 ? 0 : index) / pageSize) * pageSize;
            },
            /**
             * Clear statistic items as zero.
             */
            clearStatisticItem: function () {
                var wrapper = $('.c-msg-statistic', wMessenger);

                if (!wrapper.length) {
                    return;
                }

                $('.c-msg-stat-num', wrapper).html(0);
                $('.c-msg-progress-bar', wrapper).width(0);
                $('.c-msg-stat-percent', wrapper).html('0.0%');
                $('.c-msg-statistic-total', wrapper).html('0');
            },
            /**
             * Analyze message types in cache.
             * @returns {{info: number, success: number, warning: number, error: number, _total: number}}
             */
            statisticAnalyze: function () {
                var result = {
                    info: 0,
                    success: 0,
                    warning: 0,
                    error: 0,
                    _total: 0
                }, t;

                for (t in msgCache) {
                    if (!msgCache.hasOwnProperty(t)) {
                        continue;
                    }

                    var type = msgCache[t]['type'];

                    if (!type || result[type] === 'undefined') {
                        continue;
                    }

                    result[type]++;
                }

                result._total = result.info + result.success + result.warning + result.error;
                return result;
            },
            /**
             * Check the layout whether at the bottom of the page.
             * @returns {boolean}
             */
            checkBottomLayout: function () {
                if (!wMessenger) {
                    isBottomLayout = (settings.layout.split('-')[0] === 'bottom');
                } else {
                    isBottomLayout = !!wMessenger.filter('[class*="c-msg-layout-bottom"]').length;
                }

                return isBottomLayout;
            },
            /**
             * Hide popup dialog.
             * Auto clear message items or clear items by hand will trigger this function.
             */
            autoHidePopup: function () {
                if (!_.getCurItemSize() && isPopup) {
                    wMessenger.hide();
                }
            },
            /**
             * Switch the position of toolbar and handler when dialog position changed.
             */
            switchPosition: function (isBottomLayout) {
                if (isBottomLayout) {
                    wToolBar.appendTo(wMessenger);
                    wHandlerBar.prependTo(wMessenger);
                } else {
                    wToolBar.prependTo(wMessenger);
                    wHandlerBar.appendTo(wMessenger);
                }
            },
            /**
             * Change popup window to message console or reverse.
             * Popup - UI properties: message body(cancel), drawer bar.
             * Console - UI properties: toolbar, message body(remove), paging.
             */
            togglePopupAndConsole: function () {
                var paging = $('.c-icon-arrow-left,.c-icon-arrow-right,.c-msg-paginateLabel', wHandlerBar),
                    drawer = $('.c-icon-drawer', wHandlerBar);

                if (isPopup) {
                    wToolBar.hide();
                    paging.hide();
                    drawer.show();
                    wHandlerBar.hide();

                    _.paging.registerPaginateKeyEvent(false);
                    isFreeze = false;
                } else {
                    wToolBar.show();
                    paging.show();
                    drawer.hide();
                    wHandlerBar.show();

                    _.paging.registerPaginateKeyEvent(true);
                }
            },
            /**
             * Show or hide HandlerBar.
             */
            toggleHandlerBar: function () {
                settings.handle ? wHandlerBar.show() : wHandlerBar.hide();
            },
            paging: {
                pagePrev: function () {
                    _.render.fillManager(_.getPageStartIndex(nextPageIndex - settings.pageSize - _.getCurItemSize()), true, _.paging.paginateLabel);
                },
                pageNext: function () {
                    _.render.fillManager(nextPageIndex, true, _.paging.paginateLabel);
                },
                pageFirst: function () {
                    _.render.fillManager(0, true, _.paging.paginateLabel);
                },
                pageLast: function () {
                    _.render.fillManager(Math.floor(msgIndex.length / settings.pageSize) * settings.pageSize, true, _.paging.paginateLabel);
                },
                /**
                 * Paginate for handler bar.
                 * @param {number} startIndex
                 */
                paginateLabel: function (startIndex) {
                    if (!startIndex) {
                        startIndex = 0;
                    }
                    $('.c-msg-start-index', wPaginate).html(startIndex - _.getCurItemSize() + 1);
                    $('.c-msg-end-index', wPaginate).html(' - ' + startIndex);
                    $('.c-msg-item-amount', wPaginate).html('&nbsp;(' + msgIndex.length + ')');
                },
                /**
                 * Register or remove Ctrl key event for paging.
                 * @param {boolean} enable
                 */
                registerPaginateKeyEvent: function (enable) {
                    var doc = $(document),
                        handler = function (e) {
                            var keyCode = e.keyCode;
                            if (!isPopup && e.ctrlKey && e.shiftKey) {
                                switch (keyCode) {
                                    case KEY_CODE.left:
                                    {
                                        _.paging.pagePrev();
                                    }
                                        break;
                                    case KEY_CODE.right:
                                    {
                                        _.paging.pageNext();
                                    }
                                        break;
                                    case KEY_CODE.up:
                                    {
                                        _.paging.pageFirst();
                                    }
                                        break;
                                    case KEY_CODE.down:
                                    {
                                        _.paging.pageLast();
                                    }
                                }
                            }
                        };

                    if (enable) {
                        doc.on('keydown', handler);
                    } else {
                        doc.off('keydown', handler);
                    }
                }
            },
            openConsole: function () {
                _.clearTimeoutQueue();
                isPopup = false;
                _.togglePopupAndConsole();
                wMessageBody.empty();
                _.paging.pageFirst();

                _.layoutAction.slideDown();
            },
            render: {
                /**
                 * Init default messenger ui.
                 * @returns {_}
                 */
                initDefaultUI: function () {
                    if ($('.c-msg-wrapper').length) {
                        return this;
                    }

                    $(settings.target).append(this.frame(curLayout).hide().append(this.toolBar()).append(this.messageBody()).append(this.handlerBar(false)));
                    return this;
                },
                msgManager: function () {
                    isPopup = false;

                    if ($('.c-msg-wrapper').length) {
                        return;
                    }

                    var layout = (curLayout || '').replace(layoutPrefix, '') || settings.layout || 'top-center', wrapper = '';

                    if (_.checkBottomLayout()) {
                        wrapper = this.frame(layout).append(this.handlerBar(false)).append(this.messageBody()).append(this.toolBar());
                    } else {
                        wrapper = this.frame(layout).append(this.toolBar()).append(this.messageBody()).append(this.handlerBar(false));
                    }

                    $(settings.target).append(wrapper);

                    //Append data to the list
                    _.paging.pageFirst();
                },
                /**
                 * Fill message items to msBody object.
                 * @param {number} startIndex Start index in msgCache.
                 * @param {boolean} clear To clear msBody object before append message items.
                 * @param {function} callback
                 */
                fillManager: function (startIndex, clear, callback) {
                    //Check empty data.
                    var count = msgIndex.length,
                        pageSize = settings.pageSize;
                    if (count === 0) {
                        _.cacheRemoveAll();
                        return;
                    }

                    //Check last page.
                    if (count - 1 < startIndex) {
                        return;
                    }

                    //Clear useless data.
                    if (clear) {
                        wMessageBody.empty();
                    } else {
                        $('.c-msg-empty', wMessageBody).remove();
                    }

                    //Calculate end index.
                    var endIndex = startIndex + pageSize,
                        size = msgIndex.length;
                    endIndex = endIndex > size ? size : endIndex;


                    for (; startIndex < endIndex; startIndex++) {
                        var mid = msgIndex[startIndex],
                            item = msgCache[mid];

                        //Cache next paging index.
                        nextPageIndex = startIndex + 1;
                        if (!item) {
                            continue;
                        }

                        item['mid'] = mid;
                        var msgObj = _.render.msgItem(item, MESSAGE_ACTION.remove, true, true, true, null);
                        isBottomLayout ? wMessageBody.prepend(msgObj) : wMessageBody.append(msgObj);
                    }

                    if ($.isFunction(callback)) {
                        callback(startIndex);
                    }
                },
                /**
                 * Render message popup box.
                 */
                msgPopup: function () {
                    isPopup = true;

                    var layout = settings.layout || 'top-center',
                        wrapper = '',
                        isBottomLayout = (layout.split('-')[0] === 'bottom'),
                        handlerBar = this.handlerBar(false);

                    if (isBottomLayout) {
                        wrapper = this.frame(layout).append(handlerBar).append(this.messageBody());
                    } else {
                        wrapper = this.frame(layout).append(this.messageBody()).append(handlerBar);
                    }

                    $(settings.target).append(wrapper.hide());
                },
                /**
                 * Messenger frame creator
                 * @param {string} layout Layout style.
                 * @returns {*|jQuery|HTMLElement}
                 */
                frame: function (layout) {
                    wMessenger = $('<div class="c-msg-wrapper ' + layoutPrefix + layout + '"></div>').width(settings.width);

                    wMessenger.hover(function () {
                        if (isPopup) {
                            isFreeze = true;
                            _.toggleTicks(isFreeze);
                            wHandlerBar.show();
                        }
                    }, function () {
                        if (isPopup) {
                            isFreeze = false;
                            _.toggleTicks(isFreeze);
                            wHandlerBar.hide();
                        }
                    });

                    return wMessenger;
                },
                messageBody: function () {
                    return wMessageBody = $('<div class="c-msg-body"></div>');
                },
                /**
                 * Render handler bar
                 * @param {boolean} showDrawer
                 * @returns {*|jQuery|HTMLElement}
                 */
                handlerBar: function (showDrawer) {
                    wHandlerBar = $('<div class="c-msg-handler"><div class="c-msg-left c-text-left"><span class="c-icon-btn c-icon-arrow-left" title="' + _.i18n('prev') + '"></span>&nbsp;</div><div class="c-msg-center c-text-center">&nbsp;<span class="c-msg-paginateLabel"><span class="c-msg-start-index"></span><span class="c-msg-end-index"></span><span class="c-msg-item-amount"></span></span><span class="c-icon-btn c-icon-drawer ' + (showDrawer ? '' : 'c-hide') + '" title="' + _.i18n('open') + '"></span></div><div class="c-msg-right c-text-right">&nbsp;<span class="c-icon-btn c-icon-arrow-right" title="' + _.i18n('next') + '"></span></div></div>');

                    wPaginate = $('.c-msg-paginateLabel', wHandlerBar);

                    //Event binding.
                    $('.c-icon-arrow-left', wHandlerBar).click(function () {
                        _.paging.pagePrev();
                    });

                    $('.c-icon-arrow-right', wHandlerBar).click(function () {
                        _.paging.pageNext();
                    });

                    $('.c-icon-drawer', wHandlerBar).click(function () {
                        _.openConsole();
                    });

                    return wHandlerBar;
                },
                toolBar: function () {
                    //<span class="c-icon-btn c-icon-cog" title="' + _.i18n('settings') + '"></span>
                    wToolBar = $('<div class="c-msg-toolbar"><div class="c-msg-left c-text-left"><span class="c-icon-btn c-icon-list" title="' + _.i18n('list') + '"></span><span class="c-icon-btn c-icon-bars" title="' + _.i18n('stat') + '"></span><span class="c-icon-btn c-icon-remove" title="' + _.i18n('remove_all') + '"></span></div><div class="c-msg-center c-text-center"><span>' + _.i18n('title') + '</span></div><div class="c-msg-right c-text-right"><span class="c-icon-btn c-icon-cancel-circle" title="' + _.i18n('close') + '"></span></div></div>');

                    //Event binding.
                    $('.c-icon-list', wToolBar).click(function () {
                        $('[class*="c-icon-arrow"]', wMessenger).show();

                        wMessenger.find('.c-msg-statistic').remove();
                        wMessageBody.show();
                        wHandlerBar.show();

                        _.paging.pageFirst();
                    });
                    $('.c-icon-bars', wToolBar).click(function () {
                        wMessageBody.hide();
                        wHandlerBar.hide();
                        _.render.statistic();
                    });
                    $('.c-icon-remove', wToolBar).click(function () {
                        _.cacheRemoveAll();
                        _.clearStatisticItem();
                    });
                    $('.c-icon-cancel-circle', wToolBar).click(function () {
                        wMessenger.fadeOut('fast', function () {
                            wMessenger.hide();
                            wMessageBody.show();
                            wHandlerBar.show();
                            wMessenger.find('.c-msg-statistic').remove();

                            isPopup = true;
                            _.togglePopupAndConsole();
                            wMessageBody.empty();
                        });
                    });

                    return wToolBar;
                },
                /**
                 * Basic implement render for info, success, error, Warning.
                 * @param {object} message Message object created by _.cacheMessage().
                 * @param {string} action MESSAGE_ACTION.
                 * @param {boolean} closable true-Show close button when hover.
                 * @param {boolean} showIcon Show message icon.
                 * @param {boolean} showTime Show message time.
                 * @param {function} callback
                 * @returns {*|jQuery|HTMLElement}
                 */
                msgItem: function (message, action, closable, showIcon, showTime, callback) {
                    var type = message['type'],
                        time = message['time'],
                        msg = message['msg'],
                        timeStyle = ' c-msg-status-no-time',
                        descExt = '',
                        mIcon = '',
                        mTime = '';

                    if (showIcon) {
                        if (showTime) {
                            mTime = '<div class="c-msg-time">' + (time ? time : '--:--:--') + '</div>';
                            timeStyle = '';
                        }
                        mIcon = '<div class="c-msg-status' + timeStyle + ' c-text-center"><span class="c-msg-icon ' + ( MESSAGE_TYPE_ICON[type] || '') + '"></span>' + mTime + '</div>';
                        descExt = ' c-msg-desc-ext';
                    }

                    var wrapper = $('<div class="c-msg-item c-msg-type-' + type + '" data-mid="' + message['mid'] + '">' + mIcon + '<div class="c-msg-remove c-text-center"><span class="c-cloaking c-msg-icon ' + (MESSAGE_ACTION_ICON[action]) + '" title="' + (action === MESSAGE_ACTION.close ? _.i18n('cancel') : _.i18n('remove')) + '"></span></div><div class="c-msg-desc' + descExt + '"></div></div>'),
                        msgDesc = $('.c-msg-desc', wrapper);

                    msgDesc.append(_.formatMessage(msg));

                    //Event binding.
                    if (closable) {
                        $('.c-icon-cancel-circle', wrapper).click(function (e) {
                            wrapper.slideUp('fast', function () {
                                $(this).remove();
                                _.autoHidePopup();

                                if ($.isFunction(callback)) {
                                    callback(message, e);
                                }
                            });
                        });
                    } else {
                        $('.c-msg-remove', wrapper).hide();
                    }

                    $('.c-icon-remove', wrapper).click(function () {
                        wrapper.slideUp('fast', function () {
                            $(this).remove();

                            var sIndex = _.getPageStartIndex(_.cacheRemove(wrapper.attr('data-mid')));
                            if (msgIndex.length === sIndex) {
                                sIndex = sIndex - settings.pageSize;
                            }

                            _.render.fillManager(sIndex, true, _.paging.paginateLabel);
                        });
                    });

                    //Show/Hide message buttons.
                    wrapper.hover(function () {
                        if (closable) {
                            $('.c-icon-cancel-circle', wrapper).removeClass('c-cloaking').show();
                        }

                        $('.c-icon-remove', wrapper).removeClass('c-cloaking').show();

                        if (msgDesc[0].scrollHeight - msgDesc[0].clientHeight > 4) {
                            msgDesc.addClass('c-msg-desc-overflow-y');
                        }
                    }, function () {
                        if (closable) {
                            $('.c-icon-cancel-circle', wrapper).addClass('c-cloaking').fadeOut();
                        }

                        $('.c-icon-remove', wrapper).addClass('c-cloaking').fadeOut();

                        if (msgDesc[0].scrollHeight - msgDesc[0].clientHeight > 4) {
                            msgDesc.removeClass('c-msg-desc-overflow-y');
                        }
                    });

                    return wrapper;
                },
                /**
                 * Render statistic UI.
                 * @param {MESSAGE_TYPE} msgType Message type: MESSAGE_TYPE
                 * @param {Number} count Message item count.
                 * @param {string} percent The percent of current message type.
                 * @returns {string}
                 */
                statisticItem: function (msgType, count, percent) {
                    var per = percent || 0;

                    return '<div class="c-msg-stat-item c-msg-stat-' + (msgType || 'info') + '"><div class="c-msg-stat c-text-center"><span class="c-msg-icon ' + (MESSAGE_TYPE_ICON[msgType] || 'c-icon-info') + '"></span><div class="c-msg-stat-num">' + (count || 0) + '</div></div><div class="c-msg-progress-wrapper"><div class="c-msg-progress"><div class="c-msg-progress-bar" style="width: ' + per + '%;"><span class="c-msg-stat-percent">' + per + '%</span></div></div></div></div>';
                },
                /**
                 * Render statistic panel.
                 */
                statistic: function () {
                    var wrapper = $('<div class="c-msg-statistic"></div>'),
                        statResult = _.statisticAnalyze(), t,
                        footer = '<div class="c-msg-statistic-footer">' + _.i18n('total') + ' <strong class="c-msg-statistic-total">' + statResult['_total'] + '</strong></div>';

                    for (t in MESSAGE_TYPE) {
                        if (!MESSAGE_TYPE.hasOwnProperty(t)) {
                            continue;
                        }

                        var n = statResult[t],
                            per = ((n / (statResult['_total'] || 1)) * 100).toFixed(1);
                        wrapper.append(this.statisticItem(MESSAGE_TYPE[t], n, per));
                    }

                    wMessenger.find('.c-msg-statistic').remove();

                    isBottomLayout ? wMessenger.prepend(wrapper.prepend(footer)) : wMessenger.append(wrapper.append(footer));
                    wrapper.append('<div class="c-msg-clear"></div>');
                }
            },
            /**
             * Register the Page Visibility API. Used to show a desktop notification.
             */
            registerVisibility: function () {
                if (settings.notify) {
                    var hidden, visibilityChange;

                    if (typeof document['hidden'] !== 'undefined') {
                        hidden = 'hidden';
                        visibilityChange = 'visibilitychange';
                    } else if (typeof document['webkitHidden'] !== 'undefined') {
                        hidden = 'webkitHidden';
                        visibilityChange = 'webkitvisibilitychange';
                    } else if (typeof document['mozHidden'] !== 'undefined') {
                        hidden = 'mozHidden';
                        visibilityChange = 'mozvisibilitychange';
                    } else if (typeof document['msHidden'] !== 'undefined') {
                        hidden = 'msHidden';
                        visibilityChange = 'msvisibilitychange';
                    }

                    var handleVisibilityChange = function () {
                        isInactivated = !!document[hidden];
                    };

                    if (document.addEventListener) {
                        document.addEventListener(visibilityChange, handleVisibilityChange, false);
                    }

                    if (document.attachEvent) {
                        document.attachEvent(visibilityChange, handleVisibilityChange);
                    }
                }

                return this;
            },
            /**
             * Request Permission of notification.
             */
            requestPermission: function () {
                if (settings.notify && Notification) {
                    Notification.requestPermission(function (permission) {
                        isPermission = (permission === 'granted');
                    });
                }

                return this;
            },
            /**
             * Create desktop Notification.
             * @param {object} message
             * @param {function} callback
             */
            createNotify: function (message, callback) {
                var type = message['type'],
                    ins = new Notification(type.toUpperCase(), {
                            dir: 'ltr',
                            body: $('<div></div>').append(message.msg).text(),
                            icon: [settings.notifyIconUrl, '/style/icon-', type, '.png'].join('')
                        }
                    );

                ins.onclick = function (e) {
                    if ($.isFunction(callback)) {
                        callback(message, e);
                    }
                };
                ins.onclose = function (e) {
                    if ($.isFunction(callback)) {
                        callback(message, e);
                    }
                };
            },
            /**
             * Combine user's property and system property as a new one.
             * @param {*} userProp
             * @param {*} sysProp
             * @returns {*}
             */
            combineProperty: function (userProp, sysProp) {
                if (userProp !== undefined) {
                    return userProp;
                }
                return sysProp;
            },
            /**
             * Create a random id for message.
             * @returns {string}
             */
            getMID: function () {
                return new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
            },
            /**
             * Get time string with the format of 'hh:mm:ss'.
             * @returns {string}
             */
            getTimeAsStr: function () {
                var fmt = function (t) {
                    if (t < 10) {
                        return '0' + t;
                    }
                    return t;
                }, d = new Date();

                return [fmt(d.getHours()), fmt(d.getMinutes()), fmt(d.getSeconds())].join(':');
            },
            /**
             * Intelligent calculate the text length, and give a suitable time for reading.
             * Legal time: 2000~
             * @param {string} [text]
             * @returns {number}
             */
            calculateTimeout: function (text) {
                var sec = text.length / 50;
                if (sec < 2) {
                    sec = 2;
                } else if (sec > 10) {
                    sec = 10;
                }
                return sec * 1000;
            },
            /**
             * Convert text: number/keywords highlights, url to link, email to mailto etc.
             * @param {string} text
             * @returns {*}
             */
            convertKeywords: function (text) {
                return text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/ig, ' <a href="mailto:$1">$1</a> ').replace(/((http|ftp|https|file):\/\/([\w\-]+\.)+[\w\-]+(\/[\w\u4e00-\u9fa5\-\.\/?\@\%\!\&=\+\~\:\#\;\,]*)?)/ig, ' <a href="$1" target="_blank">$1</a> ');
                //.replace(/(-?\d*\.?\d)/ig, '<strong>$1</strong>');
            },
            /**
             * Clear HTML tag.
             * @param {string} text
             * @returns {XML|string}
             */
            clearHtmlTag: function (text) {
                return text.replace(/<\/?[^>]*>/g, '').replace(/(^\s*)|(\s*$)/g, '');
            },
            /**
             * @param {string|jQuery} message
             * @returns {string|jQuery}
             */
            formatMessage: function (message) {
                if (typeof message === 'undefined') {
                    return '&nbsp;';
                }

                if (message['jquery']) {
                    return message;
                } else {
                    return _.convertKeywords(_.clearHtmlTag(message));
                }
            },
            /**
             * Set Message Timeout, then close itself.
             * @param {string} mid
             * @param {object} message
             * @param {$|jQuery} msgObj
             * @param {number} timeout
             * @param {function} onClosed
             */
            setMessageTimeout: function (mid, message, msgObj, timeout, onClosed) {
                var millisecond = _.combineProperty(timeout, settings.timeout);

                //Never close message itself.
                if (millisecond < 0) {
                    return;
                }

                //Close message in timeout.
                //millisecond === 0 || millisecond < 2e3 || millisecond > 10e3
                if (millisecond === 0) {
                    millisecond = _.calculateTimeout(msgObj.text());
                }

                ticks[mid] = new Timeout(function () {
                    msgObj.slideUp('fast', function (e) {
                        delete ticks[mid];
                        msgObj.remove();
                        _.autoHidePopup();

                        if ($.isFunction(onClosed)) {
                            onClosed(message, e);
                        }
                    });
                }, millisecond);
            },
            /**
             * Create a single message object with properties.
             * @param {string} type Message types.
             * @param {string|jQuery} message The message can be a plain text, DOM string or jQuery object.
             * @returns {{mid: *, time: *, msg: *, type: *}}
             */
            cacheMessage: function (type, message) {
                //If message cache reached the limited cache size, then shift the first one.
                if (msgIndex.length === settings.cacheSize) {
                    delete msgCache[msgIndex.shift()];
                }

                var mid = _.getMID(),
                    time = _.getTimeAsStr(),
                    msgObj = {
                        time: time,
                        msg: message,
                        type: type
                    };

                msgCache[mid] = msgObj;
                msgIndex.push(mid);

                msgObj['mid'] = mid;
                return msgObj;
            },
            /**
             * Message create entrance.
             * @param {string} msgType MESSAGE_TYPE.
             * @param {string|array|jQuery} messages Message
             * @param {object} opt Option setting for a single message.
             */
            messagesHandler: function (msgType, messages, opt) {
                if (!$.isPlainObject(opt)) {
                    opt = {};
                }

                if (!opt.target && !$(opt.target).length) {
                    wMessenger.show();
                }

                if ($.isArray(messages)) {
                    for (var i = 0, size = messages.length; i < size; i++) {
                        _.createMessage(msgType, messages[i], opt);
                    }
                } else {
                    _.createMessage(msgType, messages, opt);
                }
            },
            /**
             * Message create entrance.
             * @param {string} msgType MESSAGE_TYPE.
             * @param {string|jQuery} message Message
             * @param {object} opt Option setting.
             //         * @param {$|jQuery} target Target to append message object.
             */
            createMessage: function (msgType, message, opt) {
                var onClosed = opt.onClosed || settings.onClosed,
                    onCreated = opt.onCreated || settings.onCreated,

                //:: Cache and create message object.
                    msgObj = _.cacheMessage(msgType, message),

                //:: Create message DOM(jQuery).
                    msgDom = _.render.msgItem(msgObj, MESSAGE_ACTION.close,
                        _.combineProperty(opt.closable, settings.closable),
                        _.combineProperty(opt.messageIcon, settings.messageIcon),
                        _.combineProperty(opt.messageTime, settings.messageTime),
                        onClosed).hide(),

                //:: Change append target & Display message on page.
                //:: Append message to the right place.
                    wrapper = $(opt.target);

                if (wrapper.length) {
                    //Nested mode
                    if (!_.combineProperty(opt.popupMode, settings.popupMode)) {
                        wrapper.empty();
                    }
                    wrapper.append(msgDom);
                } else {
                    //Popup mode
                    //If it is the first page and the amount is not reach pageSize numbers,
                    //We need to append the new item message to the management body.
                    if (isPopup) {
                        if (!isFreeze) {
                            if (!_.combineProperty(opt.popupMode, settings.popupMode)) {
                                wMessageBody.empty();
                            }

                            if (isBottomLayout) {
                                var items = wMessageBody.find('.c-msg-item');
                                if (items.length > settings.popupSize) {
                                    $(items).eq(0).remove();
                                }
                                wMessageBody.append(msgDom);
                            } else {
                                wMessageBody.find('.c-msg-item:gt(' + (settings.popupSize - 2) + ')').remove();
                                wMessageBody.prepend(msgDom);
                            }
                        }
                    } else {
                        var size = _.getCurItemSize();
                        if (size < settings.pageSize) {
                            _.render.fillManager(nextPageIndex - size, true, _.paging.paginateLabel);
                        }

                        $('.c-msg-item-amount', wPaginate).html('(' + msgIndex.length + ')');

                        //If statistic panel is visible, then refresh it.
                        if ($('.c-msg-statistic', wMessenger).is(':visible')) {
                            _.render.statistic();
                        }
                    }
                }

                //:: Create notify message.
                if (_.combineProperty(opt.notify, settings.notify) && isPermission && isInactivated) {
                    _.createNotify(msgObj, onClosed);
                }
                //----------------------------------------------------------------------

                if ($.isFunction(onCreated)) {
                    onCreated(msgObj);
                }

                //----------------------------------------------------------------------

                //:: Upload message to server.
                _.uploadMessage(msgObj);

                msgDom.slideDown();

                _.setMessageTimeout(msgObj.mid, message, msgDom, _.combineProperty(opt.timeout, settings.timeout), onClosed);
            },
            layoutAction: {
                slideUp: function (callback) {
                    wMessenger.slideUp(function () {
                        if ($.isFunction(callback)) {
                            callback();
                        }
                    });

                },
                slideDown: function (callback) {
                    wMessenger.slideDown(function () {
                        if ($.isFunction(callback)) {
                            callback();
                        }
                    });
                }
            },
            /**
             * Set messenger layout: messenger's position,...
             * @param {string} layout Layout suffix class string. e.g. c-msg-layout-[top-left].
             * @param {function} callback
             */
            setLayout: function (layout, callback) {
                var LAYOUT = {
                    'top-left': 'top-left',
                    'top-center': 'top-center',
                    'top-right': 'top-right',
                    'bottom-left': 'bottom-left',
                    'bottom-center': 'bottom-center',
                    'bottom-right': 'bottom-right'
                };
                if (!layout || !LAYOUT[layout]) {
                    return;
                }

                if (layout !== (curLayout || settings.layout)) {
                    wMessenger.removeClass().addClass('c-msg-wrapper ' + (layoutPrefix + layout));
                    curLayout = layout;
                }

                _.switchPosition(_.checkBottomLayout());

                if (wMessenger.find('.c-msg-statistic').length) {
                    _.render.statistic();
                }


                if ($.isFunction(callback)) {
                    callback(curLayout);
                }
            },
            /**
             * Upload message to server after the message created.
             * @param {object} message
             */
            uploadMessage: function (message) {
                var type = message['type'];

                //Check upload switch & upload type.
                if (!settings.autoUpload && type && settings.uploadType[type]) {
                    return;
                }

                var message_ = $.extend(true, {}, message),
                    msg = message_['msg'];

                if (msg && msg['jquery']) {
                    message_['msg'] = _.jQuery2DOM(msg);
                }

                $.post(settings.uploadUrl, message_, function (data) {
                    var onUploaded = settings.onUploaded;
                    if ($.isFunction(onUploaded)) {
                        onUploaded(message, data);
                    }
                });
            }
        },
        /**
         * Common APIs
         * @type {{setNotify: Function, setClosable: Function, setCacheSize: Function, setPopupMode: Function, setPopupSize: Function, setLayout: Function, setTarget: Function, setTargetDefault: Function, setWidth: Function, setTimeout: Function, setAutoUpload: Function, setUploadUrl: Function, setUploadType: Function, setHandle: Function, setMessageTime: Function, setMessageIcon: Function, setting: Function, info: Function, error: Function, success: Function, warning: Function, clear: Function, remove: Function, openConsole: Function, closeConsole: Function, getSettings: Function, getMessage: Function, getMessages: Function, getMessagesId: Function, t_togglePopupAndConsole: Function, t_getVars: Function}}
         */
            api = {
            /**
             * Set desktop notification switch.
             * @param {boolean} enable
             * @returns {api}
             */
            setNotify: function (enable) {
                settings.notify = !!enable;
                return this;
            },
            /**
             * Set message closable button switch.
             * @param {boolean} enable
             * @returns {api}
             */
            setClosable: function (enable) {
                settings.closable = !!enable;
                return this;
            },
            /**
             * Set Cache size.
             * @param {number} size
             * @returns {api}
             */
            setCacheSize: function (size) {
                if (typeof size === 'number') {
                    var n = parseInt(size, 10);
                    if (n > -1) {
                        settings.cacheSize = size;
                    }
                }
                return this;
            },
            /**
             * Message popup mode:
             * true - show some messages(popupSize) at one time. If the number of the message reach popupSize, the last one will be replaced by the new one. All messages will be disappeared when time out.
             * false - show one message at one time.
             * @param {boolean} enable
             * @returns {api}
             */
            setPopupMode: function (enable) {
                settings.popupMode = !!enable;
                return this;
            },
            /**
             * The maximum message number in the popup message box.
             * @param {number} size
             * @returns {api}
             */
            setPopupSize: function (size) {
                if (!size || size < 1 || size > 50) {
                    size = 5;
                }
                settings.pageSize = size;
                return this;
            },
            /**
             * Set UI layout.
             * @param {string} layout
             * @returns {api}
             */
            setLayout: function (layout) {
                _.setLayout(layout, function (l) {
                    settings.layout = l;
                });
                return this;
            },
            /**
             * Set messenger append target.
             * @param {string|jQuery|$} target
             * @returns {api}
             */
            setTarget: function (target) {
                var targetObj = $(target);
                if (targetObj.length) {
                    wMessenger.appendTo(targetObj);
                }
                return this;
            },
            /**
             * Set messenger default append target 'body'.
             * @returns {api}
             */
            setTargetDefault: function () {
                wMessenger.appendTo('body');
                return this;
            },
            /**
             * Set the width of the message box.
             * @param {number|string} width
             * @returns {api}
             */
            setWidth: function (width) {
                var w = window.outerWidth;
                wMessenger.width(width);

                if (wMessenger.width() > w) {
                    width = w;
                    wMessenger.width(w);
                }

                settings.width = width;
                return this;
            },
            setTimeout: function (timeout) {
                settings.timeout = timeout;
                return this;
            },
            setAutoUpload: function (enable) {
                settings.autoUpload = !!enable;
                return this;
            },
            setUploadUrl: function (url) {
                settings.uploadUrl = url;
                return this;
            },
            setUploadType: function (typeObj) {
                settings.uploadType = $.extend(false, settings.uploadType, typeObj);
                return this;
            },
            setHandle: function (enable) {
                settings.handle = !!enable;
                _.toggleHandlerBar();
                return this;
            },
            setMessageTime: function (enable) {
                settings.messageTime = !!enable;
                return this;
            },
            setMessageIcon: function (enable) {
                settings.messageIcon = !!enable;
                return this;
            },
            /**
             * Override default settings.
             * @param {object} opts
             * @returns {api}
             */
            setting: function (opts) {
                if ($.isPlainObject(opts)) {

                    //Immediate params reflect the UI. Contains: width, layout, target, pageSize.
                    var opts_ = $.extend(false, {}, opts),
                        pageSize = opts_['pageSize'],
                        width = opts_['width'];

                    //:pageSize
                    if (pageSize > 0 && pageSize < 31) {
                        settings.pageSize = Number(pageSize);
                        delete opts_['pageSize'];
                    }

                    //:width
                    if (typeof width !== 'undefined') {
                        this.setWidth(width);
                        delete opts_['width'];
                    }

                    //:target
                    var targetObj = $(opts_['target']);
                    if (targetObj.length) {
                        wMessenger.appendTo(targetObj);
                        delete opts_['target'];
                    }

                    //:layout
                    _.setLayout(opts_['layout'], function (l) {
                        opts_['layout'] = l;
                    });

                    //Override the default settings.
                    settings = $.extend(false, settings, opts_);
                }

                return this;
            },
            /**
             * Show info message.
             * @param {string|jQuery|Array} messages
             * @param {object} opt
             * @returns {api}
             */
            info: function (messages, opt) {
                _.messagesHandler(MESSAGE_TYPE.info, messages, opt);
                return this;
            },
            /**
             * Show error message.
             * @param {string|jQuery|Array} messages
             * @param {object} opt
             * @returns {api}
             */
            error: function (messages, opt) {
                _.messagesHandler(MESSAGE_TYPE.error, messages, opt);
                return this;
            },
            /**
             * Show success message.
             * @param {string|jQuery|Array} messages
             * @param {object} opt
             * @returns {api}
             */
            success: function (messages, opt) {
                _.messagesHandler(MESSAGE_TYPE.success, messages, opt);
                return this;
            },
            /**
             * Show warning message.
             * @param {string|jQuery|Array} messages
             * @param {object} opt
             * @returns {api}
             */
            warning: function (messages, opt) {
                _.messagesHandler(MESSAGE_TYPE.warning, messages, opt);
                return this;
            },
            /**
             * Clear away popup message.
             * @returns {api}
             */
            clear: function () {
                _.layoutAction.slideUp(function () {
                    _.clearTimeout();
                    wMessageBody.empty();
                });

                return this;
            },
            /**
             * Remove all of the cached data, and repaint the ui.
             * @returns {api}
             */
            remove: function () {
                _.cacheRemoveAll();
                return this;
            },
            /**
             * Show management dialog.
             * @returns {api}
             */
            openConsole: function () {
                _.openConsole();
                return this;
            },
            /**
             * Close management dialog.
             * @returns {api}
             */
            closeConsole: function () {
                _.layoutAction.slideUp();

                wMessenger.hide();
                wMessageBody.show();
                wHandlerBar.show();
                wMessenger.find('.c-msg-statistic').remove();

                isPopup = true;
                _.togglePopupAndConsole();
                wMessageBody.empty();
                return this;
            },
            /**
             * Get details settings.
             * @returns {{notify: boolean, notifyIconUrl: string, closable: boolean, handle: boolean, popupMode: boolean, popupSize: number, layout: string, target: string, width: number, timeout: number, cacheSize: number, pageSize: number, autoUpload: boolean, uploadUrl: string, uploadType: {info: boolean, success: boolean, warning: boolean, error: boolean}, messageTime: boolean, messageIcon: boolean, drawer: boolean, onCreated: Function, onUploaded: Function, onClosed: Function}}
             */
            getSettings: function () {
                return settings;
            },
            /**
             * Get single message by message id.
             * @param {string} mid
             * @returns {*|{}}
             */
            getMessage: function (mid) {
                return msgCache[mid] || {};
            },
            /**
             * Get all of the message cache.
             * @returns {{}}
             */
            getMessages: function () {
                return msgCache;
            },
            /**
             * Get all of the message id cache.
             * @returns {Array}
             */
            getMessagesId: function () {
                return msgIndex;
            }
        };

    $(document).ready(function(){
        _.init();
    });
    return api;
})($ || jQuery);