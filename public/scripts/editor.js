var quill = new Quill('#editor-container', {  
  modules: {
    toolbar: '#toolbar-container'
  },
  theme: 'snow'
});

var Parchment = Quill.import("parchment");

let CustomClass = new Parchment.Attributor.Class('custom', 'ql-custom', {
  scope: Parchment.Scope.INLINE
});

Quill.register(CustomClass, true);

var saveButton = document.querySelector('#save-button');
saveButton.addEventListener('click', function () {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/editor', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        data: quill.getText()
    }));
});