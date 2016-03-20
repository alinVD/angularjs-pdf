/*! Angular-PDF Version: 2.0.0 | Released under an MIT license */
(function() {

  'use strict';

  angular.module('pdf', []).directive('ngPdf', [ '$window', '$timeout',
    function($window, $timeout) {
    var renderTask = []; // array of render tasks, one per page
    var pdfLoaderTask = null;
    var debug = false;

    var backingScale = function(canvas) {
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var bsr = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;

      return dpr / bsr;
    };

    var setCanvasDimensions = function(canvas, w, h) {
      var ratio = backingScale(canvas);
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      canvas.style.width = Math.floor(w) + 'px';
      canvas.style.height = Math.floor(h) + 'px';
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      return canvas;
    };
    return {
      restrict: 'E',
      templateUrl: function(element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'partials/viewer.html';
      },
      link: function(scope, element, attrs) {
        element.css('display', 'block');
        // scope alias if constructorAs is used
        var alias = attrs.alias;
        var url = alias ? scope[alias].pdfUrl : scope.pdfUrl;
        var data = alias ? scope[alias].pdfData : scope.pdfData;
        var pdfDoc = null;
        var pageToDisplay = isFinite(attrs.page) ? parseInt(attrs.page) : 1;
        var pageFit = attrs.scale === 'page-fit';
        var scale = pageFit ? 1 : parseInt(attrs.scale);
        var canvasContId = attrs.containerid || 'pdf-container';
        scope.pageIDs = [];
        scope.canvasClass = 'rotate0';

        debug = attrs.hasOwnProperty('debug') ? attrs.debug : false;
        var creds = attrs.usecredentials;

        var windowEl = angular.element($window);

        windowEl.on('scroll', function() {
          scope.$apply(function() {
            scope.scroll = windowEl[0].scrollY;
          });
        });

        PDFJS.disableWorker = true;
        scope.pageNum = pageToDisplay;

        scope.renderPage = function(num) {
          if (renderTask[num]) {
              renderTask[num]._internalRenderTask.cancel();
          }

          pdfDoc.getPage(num).then(function(page) {
            var viewport;
            var pageWidthScale;
            var renderContext;

            if (pageFit) {
              viewport = page.getViewport(1);
              var clientRect = element[0].getBoundingClientRect();
              pageWidthScale = clientRect.width / viewport.width;
              scale = pageWidthScale;
            }
            viewport = page.getViewport(scale);
            // pageIDs has index starting at 0
            var canvas = document.getElementById(scope.pageIDs[num - 1]);
            var ctx = canvas.getContext('2d');
            setCanvasDimensions(canvas, viewport.width, viewport.height);

            renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            renderTask = page.render(renderContext);
            renderTask.promise.then(function() {
                if (typeof scope.onPageRender === 'function') {
                    scope.onPageRender();
                }
            }).catch(function (reason) {
                console.log(reason);
            });
          });
        };

        /**
         * Renders all the pages
         * @return {[type]} [description]
         */
        scope.renderAllPages = function() {
          for (var i = 1; i <= scope.pageCount; i = i + 1){
            scope.renderPage(i);
          }
        }

        scope.zoomIn = function() {
          pageFit = false;
          scale = parseFloat(scale) + 0.2;
          scope.renderAllPages();
          return scale;
        };

        scope.zoomOut = function() {
          pageFit = false;
          scale = parseFloat(scale) - 0.2;
          scope.renderAllPages();
          return scale;
        };

        scope.fit = function() {
          pageFit = true;
          scope.renderAllPages();
        }

        scope.rotate = function() {
          switch (scope.canvasClass){
            case 'rotate0': scope.canvasClass = 'rotate90'; break;
            case 'rotate90': scope.canvasClass = 'rotate180'; break;
            case 'rotate180': scope.canvasClass = 'rotate270'; break;
            case 'rotate270': scope.canvasClass = 'rotate0'; break
          }
        };

        function renderPDF() {
          if (url && url.length || data && data.byteLength > 0) {
            pdfLoaderTask = PDFJS.getDocument(
              data && data.byteLength > 0 ? // data takes preference
              {
                'data': data,
                'withCredentials': creds
              } : // if not, load the url
              {
                'url': url,
                'withCredentials': creds
              }, null, null, scope.onProgress);
            pdfLoaderTask.then(
                function(_pdfDoc) {
                  if (typeof scope.onLoad === 'function') {
                    scope.onLoad();
                  }

                  pdfDoc = _pdfDoc;

                  scope.$apply(function() {
                    scope.pageCount = _pdfDoc.numPages;
                    var pageIDs = [];
                    for (var i = 1; i <= scope.pageCount; i = i + 1){
                      pageIDs.push(canvasContId + i);
                    }
                    scope.pageIDs = pageIDs;
                  });

                  // render pages once they are all setup
                  $timeout(function() {
                    scope.renderAllPages();
                  }); // do we need this delay?
                }, function(error) {
                  if (error) {
                    if (typeof scope.onError === 'function') {
                      scope.onError(error);
                    }
                  }
                }
            );
          }
        }

        // Function to reload the pdf cleanly.
        scope.cleanReload = function() {
          scope.pageNum = scope.pageToDisplay = pageToDisplay;
            if (pdfLoaderTask) {
                pdfLoaderTask.destroy().then(function () {
                    renderPDF();
                });
            } else {
                renderPDF();
            }
        }

        // Watch for changes of the URL
        scope.$watch('pdfUrl', function(newVal) {
          if (newVal !== '') {
            if (debug) {
              console.log('pdfUrl value change detected: ', scope.pdfUrl);
            }
            url = newVal;
            scope.cleanReload();
          }
        });

      }
    };
  } ]);
})();
