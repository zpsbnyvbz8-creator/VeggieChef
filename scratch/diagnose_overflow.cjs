const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const tempDir = require('os').tmpdir() + '/edge_audit_' + Date.now();
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--user-data-dir=' + tempDir,
  '--no-first-run',
  '--no-default-browser-check',
  '--inprivate',
  '--disable-sync',
  '--disable-gpu',
  'http://localhost:3000/'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9224/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      const tabs = JSON.parse(raw);
      console.log('Open tabs:', tabs.map(t => ({ title: t.title, url: t.url })));
      const targetTab = tabs.find(t => t.url && t.url.includes('localhost:3000')) || tabs[0];
      const wsUrl = targetTab?.webSocketDebuggerUrl;
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        // Force mobile viewport 390x844
        ws.send(JSON.stringify({
          id: 1,
          method: 'Emulation.setDeviceMetricsOverride',
          params: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
        }));

        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const winW = window.innerWidth;
                const docW = document.documentElement.scrollWidth;
                const bodyW = document.body.scrollWidth;
                const offenders = [];
                document.querySelectorAll('*').forEach(el => {
                  const r = el.getBoundingClientRect();
                  if (r.right > winW + 1) {
                    offenders.push({
                      tag: el.tagName,
                      id: el.id,
                      cls: el.className ? String(el.className).slice(0, 50) : '',
                      right: Math.round(r.right),
                      width: Math.round(r.width)
                    });
                  }
                });
                offenders.sort((a,b) => b.right - a.right);
                return JSON.stringify({ winW, docW, bodyW, count: offenders.length, top: offenders.slice(0, 15) });
              })()`,
              returnByValue: true
            }
          }));
        }, 1000);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === 2) {
          console.log('AUDIT RESULT:', msg.result?.result?.value);
          // Take screenshot at exact 390 width
          ws.send(JSON.stringify({
            id: 3,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        } else if (msg.id === 3) {
          fs.writeFileSync('C:\\Users\\gunni\\.gemini\\antigravity-ide\\brain\\2f856fa4-ae8f-44b2-a214-11392d279c2d\\scratch\\mobile_390_exact.png', Buffer.from(msg.result.data, 'base64'));
          console.log('Saved mobile_390_exact.png');
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 3000);
