import { createRouter, createWebHashHistory } from 'vue-router'
import WelcomePage from '../views/WelcomePage.vue'
import MentalModelPage from '../views/MentalModelPage.vue'
import PowerPlatformPage from '../views/PowerPlatformPage.vue'
import StarterKitPage from '../views/StarterKitPage.vue'
import YourToolsPage from '../views/YourToolsPage.vue'
import WorkingWithClaudePage from '../views/WorkingWithClaudePage.vue'
import UILibraryPage from '../views/UILibraryPage.vue'
import SecurityPage from '../views/SecurityPage.vue'
import AISecurityPage from '../views/AISecurityPage.vue'
import ALMPage from '../views/ALMPage.vue'
import ReadyPage from '../views/ReadyPage.vue'

export interface Module {
  id: string
  path: string
  title: string
  number: number
}

export const modules: Module[] = [
  { id: 'welcome',       number: 1,  path: '/',               title: 'Welcome' },
  { id: 'mental-model',  number: 2,  path: '/mental-model',   title: 'The Mental Model' },
  { id: 'power-platform', number: 3, path: '/power-platform', title: 'Power Platform 101' },
  { id: 'starter-kit',   number: 4,  path: '/starter-kit',    title: 'The Starter Kit' },
  { id: 'tools',         number: 5,  path: '/tools',          title: 'Your Tools' },
  { id: 'claude',        number: 6,  path: '/claude',         title: 'Working with Claude' },
  { id: 'ui-library',    number: 7,  path: '/ui-library',     title: 'The UI Library' },
  { id: 'security',      number: 8,  path: '/security',       title: 'Starter Security Measures' },
  { id: 'ai-security',   number: 9,  path: '/ai-security',    title: 'AI & Data Security' },
  { id: 'alm',           number: 10, path: '/alm',            title: 'ALM & The Pipeline' },
  { id: 'ready',         number: 11, path: '/ready',          title: "You're Ready" },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',               component: WelcomePage },
    { path: '/mental-model',   component: MentalModelPage },
    { path: '/power-platform', component: PowerPlatformPage },
    { path: '/starter-kit',    component: StarterKitPage },
    { path: '/tools',          component: YourToolsPage },
    { path: '/claude',         component: WorkingWithClaudePage },
    { path: '/ui-library',     component: UILibraryPage },
    { path: '/security',       component: SecurityPage },
    { path: '/ai-security',    component: AISecurityPage },
    { path: '/alm',            component: ALMPage },
    { path: '/ready',          component: ReadyPage },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
