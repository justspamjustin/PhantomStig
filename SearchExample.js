var PhantomStig = require('./phantomstig');
var startUrl = 'http://bing.com';
var searchQuery = 'Junior JS';

console.log('Searching bing...');
var stig = new PhantomStig();
stig.open(startUrl);
stig.waitForElement('#sb_form_q');
stig.setElementValue('#sb_form_q', searchQuery);
stig.submitForm('#sb_form');
stig.waitForElement('.sb_tlst');
stig.getText('.sb_tlst', function (text) {
  console.log('This was the top result: "' + text + '"');
});
stig.run(function () {
  console.log('SUCCESS!');
});
