import './node-runtime.cjs';

process.env.NODE_ENV = 'production';
await import('../dist/server.js');
