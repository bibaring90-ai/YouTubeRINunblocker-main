chrome.storage.local.get(["installdate"]).then((result) => {
  if (Number(result.installdate) != 1) {
    chrome.storage.local.get(["p1"]).then((result1) => {
      var p1 = Number(result1.p1);
      var p2 = Date.now();
      console.log((p2 - p1) / 1000);
      console.log(result.installdate);
      if (p1 && (p2 - p1) / 1000 < 5 && (p2 - p1) / 1000 > 0) {
        var aaj = new Date();
        var ms = aaj.getTime();
        console.log(ms);
        if (ms > Number(result.installdate) + 259200000) {
          inject_ratingbox();
          chrome.storage.local.set({ installdate: 1 });
        }
      }
    });
  }
});

function handleMessage(event) {
  if (event.origin.indexOf("chrome-extension://" + chrome.runtime.id) != -1) {
    if (event.data == "Close the yt-ub-rating boxx nao") {
      if (document.getElementById("yt_unblock_ratingbx")) {
        document.getElementById("yt_unblock_ratingbx").remove();
      }
      chrome.storage.local.set({ installdate: 1 });
    }
  }
}

function inject_ratingbox() {
  window.addEventListener("message", handleMessage);
  var div = document.createElement("div");
  div.id = "yt_unblock_ratingbx";
  div.innerHTML = `
    <div style="position:fixed;top:20px;right:20px;background:#fff;border:2px solid #ff0000;padding:15px;z-index:1000000;font-family:Arial,sans-serif;">
      <p>Нравится расширение?</p>
      <button onclick="window.postMessage('Close the yt-ub-rating boxx nao', '*')" style="margin-top:10px;">Закрыть</button>
    </div>
  `;
  if (document.body) {
    document.body.appendChild(div);
  } else {
    setTimeout(inject_ratingbox, 1200);
  }
}