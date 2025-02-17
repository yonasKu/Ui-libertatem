// chrome.action.onClicked.addListener((tab) => {
//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func :() =>{
//         alert('hello from extension')
//     }
//   });
// });
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isSelectionActive: true }); // Default: selection enabled
    console.log("Extension installed.");
  })