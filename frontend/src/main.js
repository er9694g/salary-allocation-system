import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Dashboard from './components/Dashboard.vue';
import NewRecord from './components/NewRecord.vue';
import RecordHistory from './components/RecordHistory.vue';
import ConfigManager from './components/ConfigManager.vue';
import Calculator from './components/Calculator.vue';
import './styles/main.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                        component: Dashboard },
    { path: '/calculator',              component: Calculator },
    { path: '/calculator/:recordId',    component: Calculator },
    { path: '/new/:recordId',           component: NewRecord },
    { path: '/history',                 component: RecordHistory },
    { path: '/config',                  component: ConfigManager },
  ],
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
