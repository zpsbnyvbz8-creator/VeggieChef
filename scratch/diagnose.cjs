const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=412,915',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      try {
        const pages = JSON.parse(data);
        const wsUrl = pages[0]?.webSocketDebuggerUrl;
        if (!wsUrl) {
          console.error('No WS URL found');
          edge.kill();
          return;
        }

        const ws = new WebSocket(wsUrl);
        let id = 1;
        const send = (method, params = {}) => {
          const reqId = id++;
          ws.send(JSON.stringify({ id: reqId, method, params }));
          return reqId;
        };

        ws.onopen = async () => {
          send('Page.enable');
          send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
          });
          send('Page.navigate', { url: 'http://localhost:3000/' });
        };

        ws.onmessage = async (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.method === 'Page.loadEventFired') {
            console.log('Page loaded!');
            // Wait 2s for React and styles to mount
            setTimeout(() => {
              send('Runtime.evaluate', {
                expression: `(() => {
                  const docWidth = document.documentElement.scrollWidth;
                  const winWidth = window.innerWidth;
                  const bodyWidth = document.body.scrollWidth;
                  const overflows = [];
                  document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.right > winWidth + 1) {
                      overflows.push({
                        tag: el.tagName,
                        id: el.id,
                        cls: (el.className || '').toString().slice(0, 60),
                        right: Math.round(r.right),
                        width: Math.round(r.width)
                      });
                    }
                  });
                  return JSON.stringify({ docWidth, winWidth, bodyWidth, overflowsCount: overflows.length, top5: overflows.slice(0, 5) });
                })()`,
                returnByValue: true
              });
            }, 2500);
          } else if (msg.result && msg.result.result && msg.result.result.value) {
            console.log('DOM METRICS:', msg.result.result.value);
            send('Page.captureScreenshot', { format: 'png' });
          } else if (msg.result && msg.result.data) {
            fs.writeFileSync('C:\\Users\\gunni\\.gemini\\antigravity-ide\\brain\\2f856fa4-ae8f-44b2-a214-11392d279c2d\\scratch\\mobile_actual.png', Buffer.from(msg.result.data, 'base64'));
            console.log('Screenshot saved to mobile_actual.png');
            ws.close();
            edge.kill();
            process.exit(0);
          }
        };

      } catch (err) {
        console.error('Error:', err);
        edge.kill();
        process.exit(1);
      }
    });
  }).on('error', err => {
    console.error('HTTP connect error:', err);
    edge.kill();
    process.exit(1);
  });
}

run();
