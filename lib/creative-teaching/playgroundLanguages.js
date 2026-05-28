/**
 * Code Playground language definitions (Piston + in-browser preview).
 */

export const PISTON_LANGUAGES = [
  {
    id: 'python',
    label: 'Python',
    version: '3.10.0',
    icon: 'PY',
    runtime: 'piston',
    starter:
      '# Python Playground\nname = "Chanda"\nprint(f"Hello from Zambia! My name is {name}")\n\nfor i in range(1, 6):\n    print(f"{i} x {i} = {i * i}")\n',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    version: '18.15.0',
    icon: 'JS',
    runtime: 'piston',
    starter:
      'const name = "Mwamba";\nconsole.log(`Hello from Zambia! My name is ${name}`);\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nfor (let i = 0; i < 8; i++) {\n  console.log(`fibonacci(${i}) = ${fibonacci(i)}`);\n}\n',
  },
  {
    id: 'java',
    label: 'Java',
    version: '15.0.2',
    icon: 'JAVA',
    runtime: 'piston',
    starter:
      'public class Main {\n  public static void main(String[] args) {\n    String name = "Nalumino";\n    System.out.println("Hello from Zambia! My name is " + name);\n    for (int i = 1; i <= 5; i++) {\n      System.out.println(i + " squared = " + (i * i));\n    }\n  }\n}\n',
  },
  {
    id: 'c',
    label: 'C',
    version: '10.2.0',
    icon: 'C',
    runtime: 'piston',
    starter:
      '#include <stdio.h>\n\nint main() {\n  printf("Hello from Zambia!\\n");\n  for (int i = 1; i <= 5; i++) {\n    printf("%d squared = %d\\n", i, i * i);\n  }\n  return 0;\n}\n',
  },
  {
    id: 'c++',
    label: 'C++',
    version: '10.2.0',
    icon: 'C++',
    runtime: 'piston',
    starter:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n  string name = "Mutale";\n  cout << "Hello from Zambia! My name is " << name << endl;\n  for (int i = 1; i <= 5; i++) {\n    cout << i << " squared = " << (i * i) << endl;\n  }\n  return 0;\n}\n',
  },
  {
    id: 'csharp.net',
    label: 'C#',
    version: '5.0.201',
    icon: 'C#',
    runtime: 'piston',
    starter:
      'using System;\n\nclass Program {\n  static void Main() {\n    string name = "Bwalya";\n    Console.WriteLine($"Hello from Zambia! My name is {name}");\n    for (int i = 1; i <= 5; i++) {\n      Console.WriteLine($"{i} squared = {i * i}");\n    }\n  }\n}\n',
  },
  {
    id: 'bash',
    label: 'Bash',
    version: '5.2.0',
    icon: 'SH',
    runtime: 'piston',
    starter:
      '#!/bin/bash\nname="Bwalya"\necho "Hello from Zambia! My name is $name"\nfor i in 1 2 3 4 5; do\n  echo "$i squared = $((i * i))"\ndone\n',
  },
]

export const PREVIEW_LANGUAGES = [
  {
    id: 'html',
    label: 'HTML',
    icon: 'HTML',
    runtime: 'iframe',
    starter: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Hello Zambia</title>
  <style>
    body { font-family: system-ui; padding: 2rem; background: #f5f2eb; }
    h1 { color: #ff3b00; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Hello, Zambia!</h1>
  <p>Edit this page and see the preview update.</p>
  <button onclick="alert('ZSMS Code Playground')">Click me</button>
</body>
</html>`,
  },
  {
    id: 'css',
    label: 'CSS',
    icon: 'CSS',
    runtime: 'css-preview',
    starter: `body {
  font-family: Georgia, serif;
  background: linear-gradient(135deg, #1e1e2e, #2d2d44);
  color: #f5f2eb;
  padding: 2rem;
  min-height: 100vh;
}
h1 { color: #ff3b00; letter-spacing: 0.05em; }
button {
  background: #22c55e;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
}`,
  },
]

export const PLAYGROUND_LANGUAGES = [...PISTON_LANGUAGES, ...PREVIEW_LANGUAGES]

export function fileNameForLanguage(langId) {
  if (langId === 'javascript') return 'main.js'
  if (langId === 'java') return 'Main.java'
  if (langId === 'bash') return 'main.sh'
  if (langId === 'python') return 'main.py'
  if (langId === 'c') return 'main.c'
  if (langId === 'c++') return 'main.cpp'
  if (langId === 'csharp.net') return 'Program.cs'
  return `main.${langId}`
}

export function monacoLanguageFor(lang) {
  if (lang.runtime === 'iframe' || lang.runtime === 'css-preview') return 'html'
  if (lang.id === 'csharp.net') return 'csharp'
  if (lang.id === 'c++') return 'cpp'
  if (lang.id === 'bash') return 'shell'
  return lang.id
}

export function buildPreviewDocument(lang, code) {
  if (lang.runtime === 'iframe') return code
  if (lang.runtime === 'css-preview') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${code}</style></head><body><h1>Welcome</h1><p>Style me with your CSS.</p><button type="button">Click</button></body></html>`
  }
  return code
}

export function isPistonLanguage(lang) {
  return lang?.runtime === 'piston'
}
