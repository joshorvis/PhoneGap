/*global angular */
/*
 jQuery UI Datepicker plugin wrapper

 @note If ≤ IE8 make sure you have a polyfill for Date.toISOString()
 @param [ui-date] {object} Options to pass to $.fn.datepicker() merged onto uiDateConfig
 */

angular.module('ui.date', [])

    .constant('uiDateConfig', {})

    .directive('uiDate', ['uiDateConfig', function (uiDateConfig) {
        'use strict';
        var options;
        options = {};
        angular.extend(options, uiDateConfig);
        return {
            require:'?ngModel',
            link:function (scope, element, attrs, controller) {
                var getOptions = function () {
                    return angular.extend({}, uiDateConfig, scope.$eval(attrs.uiDate));
                };
                var initDateWidget = function () {
                    //console.log('firing initDateWidget, scope and controller',scope,controller,scope.$eval(attrs.uiDate),scope.$eval(attrs.ngModel),scope.ngModel);
                    var showing = false;
                    var opts = getOptions();

                    // If we have a controller (i.e. ngModelController) then wire it up
                    if (controller) {

                        // Set the view value in a $apply block when users selects
                        // (calling directive user's function too if provided)
                        var _onSelect = opts.onSelect || angular.noop;
                        opts.onSelect = function (value, picker) {
                            scope.$apply(function() {
                                showing = true;
                                controller.$setViewValue(element.datepicker("getDate"));
                                _onSelect(value, picker);
                                element.blur();
                            });
                        };
                        opts.beforeShow = function() {
                            showing = true;
                        };
                        opts.onClose = function(value, picker) {
                            showing = false;
                        };
                        element.on('blur', function() {
                            if ( !showing ) {
                                scope.$apply(function() {
                                    element.datepicker("setDate", element.datepicker("getDate"));
                                    controller.$setViewValue(element.datepicker("getDate"));
                                });
                            }
                        });

                        // Update the date picker when the model changes
                        controller.$render = function () {
                            var date = controller.$viewValue;
                            if (date == '' || typeof date == 'undefined') {
                                //console.log('date is blank, now null');
                                date = null;
                            /*} else if (date === null) {
                                console.log('date is already null')
                            } else if (typeof date == 'undefined') {
                                console.log('date is undefined');
                                date = null;*/
                            } else if (!(date instanceof Date)) {
                                //console.log('parsing date',date,eval(date));
                                try {
                                    date = new Date(eval(date));
                                } catch(e) {
                                    date = new Date(date);
                                }
                            }
                            //console.log('firing controller.$render',controller.$viewValue,date);
                            if ( angular.isDefined(date) && date !== null && !(angular.isDate(date) || date === '')) {
                                throw new Error('ng-Model value must be a Date object - currently it is a ' + typeof date + ' - use ui-date-format to convert it from a string');
                            }
                            element.datepicker("setDate", date);
                        };
                    }
                    // If we don't destroy the old one it doesn't update properly when the config changes
                    element.datepicker('destroy');
                    // Create the new datepicker widget
                    element.datepicker(opts);

                    var modelVal = scope.$eval(attrs.ngModel);
                    var defaultDate = null;
                    //console.log('modelVal',modelVal);
                    if (modelVal && modelVal.length) {
                        defaultDate = new Date(modelVal);
                    }
                    //console.log('dp should be ',defaultDate);
                    element.datepicker('setDate',defaultDate);
                    if ( controller ) {
                        // Force a render to override whatever is in the input text box
                        controller.$render();
                    }
                };
                // Watch for changes to the directives options
                scope.$watch(getOptions, initDateWidget, true);
            }
        };
    }
    ])

    .constant('uiDateFormatConfig', '')

    .directive('uiDateFormat', ['uiDateFormatConfig', function(uiDateFormatConfig) {
        var directive = {
            require:'ngModel',
            link: function(scope, element, attrs, modelCtrl) {
                var dateFormat = attrs.uiDateFormat || uiDateFormatConfig;
                if ( dateFormat ) {
                    // Use the datepicker with the attribute value as the dateFormat string to convert to and from a string
                    modelCtrl.$formatters.push(function(value) {
                        if (angular.isString(value) ) {
                            return jQuery.datepicker.parseDate(dateFormat, value);
                        }
                        return null;
                    });
                    modelCtrl.$parsers.push(function(value){
                        if (value) {
                            return jQuery.datepicker.formatDate(dateFormat, value);
                        }
                        return null;
                    });
                } else {
                    // Default to ISO formatting
                    modelCtrl.$formatters.push(function(value) {
                        if (angular.isString(value) ) {
                            return new Date(value);
                        }
                        return null;
                    });
                    modelCtrl.$parsers.push(function(value){
                        if (value) {
                            return value.toISOString();
                        }
                        return null;
                    });
                }
            }
        };
        return directive;
    }]);