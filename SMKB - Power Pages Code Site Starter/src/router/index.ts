import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AboutView from '../views/AboutView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// Use createWebHistory (HTML5 mode) — Power Pages code sites return index.html
// for every route, so all paths are handled client-side by this router.
// Do NOT use createWebHashHistory — hash routes break the login redirect flow.
//
// IMPORTANT: Always use direct imports for route components, never lazy/dynamic ones.
// A dynamic route import creates per-view chunk files that are not listed in
// bundleFilePatterns and will 404 at runtime in Power Pages.
//
// Do NOT spell the lazy-import arrow form out in this comment: /ppcs-deploy's guard is a
// plain grep over this file, so writing it here blocks a deploy that has no lazy imports.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      // Catch-all — Power Pages serves index.html for every path, so unknown
      // routes reach the SPA and must render a not-found view (standalone,
      // outside the layout shell — see STANDALONE_ROUTES in App.vue).
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

export default router
