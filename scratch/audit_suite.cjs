const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\gunni\\.gemini\\antigravity-ide\\brain\\2f856fa4-ae8f-44b2-a214-11392d279c2d\\scratch';

async function main() {
  const tempDir = require('os').tmpdir() + '/edge_audit_' + Date.now();
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--inprivate',
    '--disable-sync',
    '--disable-gpu',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9225/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
      const tabs = JSON.parse(raw);
      const targetTab = tabs.find(t => t.url && t.url.includes('localhost:3000')) || tabs[0];
      const ws = new WebSocket(targetTab.webSocketDebuggerUrl);

      let msgId = 1;
      const sendCmd = (method, params = {}) => {
        return new Promise((resolve) => {
          const id = msgId++;
          const handler = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      ws.onopen = async () => {
        console.log('Connected to CDP');

        // Setup 390x844 viewport
        await sendCmd('Emulation.setDeviceMetricsOverride', {
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          mobile: true
        });

        // Wait 1.5s for initial render
        await new Promise(r => setTimeout(r, 1500));

        // 1. Scroll down to recipe cards
        await sendCmd('Runtime.evaluate', {
          expression: `window.scrollTo({ top: 750, behavior: 'instant' })`
        });
        await new Promise(r => setTimeout(r, 600));

        let snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_cards_scroll.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved mobile_cards_scroll.png');

        // Reset scroll to top
        await sendCmd('Runtime.evaluate', {
          expression: `window.scrollTo({ top: 0, behavior: 'instant' })`
        });
        await new Promise(r => setTimeout(r, 400));

        // 2. Open Filter Sheet
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('open-filter-sheet-btn')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));
        snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_filter_sheet.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved mobile_filter_sheet.png');

        // Close Filter Sheet
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('filter-sheet-apply-btn')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));

        // 3. Open Slot Machine Modal
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('explorer-slot-machine-btn')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));
        snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_slot_modal.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved mobile_slot_modal.png');

        // Close slot modal
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('close-slot-modal-btn')?.click() || document.querySelector('[aria-label="Schließen"]')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));

        // 4. Open Swipe Discovery Overlay
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('explorer-swipe-btn')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));
        snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_swipe_overlay.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved mobile_swipe_overlay.png');

        // Close swipe overlay
        await sendCmd('Runtime.evaluate', {
          expression: `document.getElementById('swipe-close-btn')?.click()`
        });
        await new Promise(r => setTimeout(r, 600));

        // 5. Desktop 1440x900 test
        await sendCmd('Emulation.setDeviceMetricsOverride', {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false
        });
        await new Promise(r => setTimeout(r, 1000));
        snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_1440.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved desktop_1440.png');

        ws.close();
        edge.kill();
        console.log('All tests completed successfully!');
        process.exit(0);
      };
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
