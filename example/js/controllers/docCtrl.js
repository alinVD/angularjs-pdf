'use strict';
/* globals FileReader */

app.controller('DocCtrl', function($scope) {

  $scope.pdfName = 'Relativity: The Special and General Theory by Albert Einstein';
  $scope.pdfData = undefined;
  $scope.pdfUrl = 'pdf/relativity.pdf';
  $scope.scroll = 0;
  $scope.loading = 'loading';

  $scope.getNavStyle = function(scroll) {
    if(scroll > 100) { return 'pdf-controls fixed'; }
    else { return 'pdf-controls'; }
  }

  $scope.onError = function(error) {
    console.log(error);
  }

  $scope.onLoad = function() {
    $scope.loading = '';
  }

  $scope.onProgress = function(progress) {
    console.log(progress);
  }

  $scope.upload = function(files){
    var reader = new FileReader();
      reader.onload = function(loadEvent) {
        $scope.pdfData= loadEvent.target.result;
        console.log('Loaded pdf of length: ', $scope.pdfData.byteLength);
      }
      reader.readAsArrayBuffer(files[0]);
  }
});
