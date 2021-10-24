import buble from 'rollup-plugin-buble';
import static_files from 'rollup-plugin-static-files';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

export default [{
    input: 'src/app.js',
    output: {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash][extname]',
        sourcemap: true
    },
    plugins: [
        buble({
            jsx: 'createElement',objectAssign: 'Object.assign'
        }),
        static_files({
            include: ['./public']
        }),
        serve({
            open: true,
            contentBase: 'dist'
        }),
        livereload()
    ]
}];