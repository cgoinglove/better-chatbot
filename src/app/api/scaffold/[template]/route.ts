const TEMPLATES: Record<string, Record<string, string>> = {
  nextjs: {
    "package.json": JSON.stringify(
      {
        name: "app",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: {
          next: "15.3.2",
          react: "19.1.1",
          "react-dom": "19.1.1",
        },
      },
      null,
      2,
    ),
    "next.config.js": "module.exports = {}\n",
    "app/page.tsx": "export default function Page(){return <div>Hello</div>}\n",
    "tsconfig.json": JSON.stringify(
      { compilerOptions: { jsx: "preserve" } },
      null,
      2,
    ),
  },
  express: {
    "package.json": JSON.stringify(
      {
        name: "api",
        private: true,
        scripts: { dev: "node index.js", start: "node index.js" },
        dependencies: { express: "^4.19.2" },
      },
      null,
      2,
    ),
    "index.js":
      "const express=require('express');const app=express();app.get('/',(_,res)=>res.send('ok'));app.listen(3000)\n",
  },
  fastapi: {
    "requirements.txt": "fastapi==0.115.0\nuvicorn==0.30.6\n",
    "main.py":
      "from fastapi import FastAPI\napp=FastAPI()\n@app.get('/')\ndef r():\n    return {'ok':True}\n",
  },
  flutter: {
    "pubspec.yaml": "name: app\ndependencies:\n  flutter:\n    sdk: flutter\n",
    "lib/main.dart":
      "import 'package:flutter/material.dart';void main()=>runApp(const MaterialApp(home: Scaffold(body: Center(child: Text('Hello')))));\n",
  },
};

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ template: string }> },
) => {
  const { template } = await params;
  const files = TEMPLATES[template];
  if (!files)
    return Response.json({ error: "unknown template" }, { status: 404 });
  return Response.json({ files });
};
