/**
 * Routing notes for a Power Apps Code App:
 *  - Hash history is REQUIRED: the Power Apps player intercepts non-hash URLs
 *    (there is no server-side rewrite), so all routes live under `/#/...`.
 *  - Prefer NOT to rely on client-side role guards for security. Identity comes
 *    from the Power Apps runtime (`getContext()`, unspoofable), access is gated by
 *    Power Platform app-sharing, and cloud flows run under the authenticated
 *    connection — the server is the real boundary. Use guards for navigation UX only.
 */
import { createRouter, createWebHashHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import NotFoundPage from "../views/NotFoundPage.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/:pathMatch(.*)*", component: NotFoundPage },
  ],
});
