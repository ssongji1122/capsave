export default ({ mode }) => ({
  build: { target: 'es2022', outDir: mode === 'toss' ? 'dist-toss' : 'dist' },
  plugins: mode === 'toss' ? [{
    name: 'scrave-toss-entry',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace('src="/src/main.js"', 'src="/src/native.js"'),
    },
  }] : [],
});
