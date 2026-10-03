const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("./src");

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });

    function getJSXElementChildren(node) {
      if (!node || !node.children) return [];
      return node.children.filter(c => c.type === "JSXElement");
    }

    function getTagName(node) {
      if (!node || node.type !== "JSXElement") return "";
      if (node.openingElement.name.type === "JSXIdentifier") {
        return node.openingElement.name.name;
      }
      return "";
    }

    function traverse(node) {
      if (!node) return;
      if (node.type === "JSXElement") {
        // Check if this node is div:
        // We are looking for:
        // div (root of component)
        //   div:nth-of-type(2)
        //     div:nth-of-type(1)
        //       div:nth-of-type(1)
        //         div:nth-of-type(1)
        //           span:nth-of-type(1)
        const name0 = getTagName(node);
        if (name0 === "div") {
          const children0 = getJSXElementChildren(node).filter(c => getTagName(c) === "div");
          if (children0.length >= 2) {
            const div2 = children0[1]; // div:nth-of-type(2)
            const children1 = getJSXElementChildren(div2).filter(c => getTagName(c) === "div");
            if (children1.length >= 1) {
              const div3 = children1[0]; // div:nth-of-type(1)
              const children2 = getJSXElementChildren(div3).filter(c => getTagName(c) === "div");
              if (children2.length >= 1) {
                const div4 = children2[0]; // div:nth-of-type(1)
                const children3 = getJSXElementChildren(div4).filter(c => getTagName(c) === "div");
                if (children3.length >= 1) {
                  const div5 = children3[0]; // div:nth-of-type(1)
                  const spans = getJSXElementChildren(div5).filter(c => getTagName(c) === "span");
                  if (spans.length >= 1) {
                    const span = spans[0];
                    console.log("MATCH 4-DIVS:", file, "line:", span.loc.start.line, "code:", code.slice(span.start, span.end));
                  }
                }
                // Also check if 3-divs:
                const spans3 = getJSXElementChildren(div4).filter(c => getTagName(c) === "span");
                if (spans3.length >= 1) {
                  console.log("MATCH 3-DIVS:", file, "line:", spans3[0].loc.start.line, "code:", code.slice(spans3[0].start, spans3[0].end));
                }
              }
            }
          }
        }
      }
      for (const key of Object.keys(node)) {
        if (node[key] && typeof node[key] === "object") {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(ast);
  } catch(e) {}
}
