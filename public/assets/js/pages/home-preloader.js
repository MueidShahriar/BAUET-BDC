import { initPreloader } from '../modules/preloader.js?v=5';

const loader = document.getElementById('page-loader');

if (loader) {
    loader.hidden = false;
    document.body.classList.add('loading');
    initPreloader({ maxWaitMs: 3000 });
}
