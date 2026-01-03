@echo on
node obfuscator.js
cd builder
npm install -g @yao-pkg/pkg
pkg .
pause