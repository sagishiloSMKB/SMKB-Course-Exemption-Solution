import "@smkbacil/design-ui/tokens-nofonts.css";
import "@smkbacil/design-ui/tokens-dark.css";
import "@smkbacil/design-ui/styles";

import { createApp } from "vue";
import { createSmkb } from "@smkbacil/design-ui";
import App from "./App.vue";
import { router } from "./router";
import "./styles/main.css";

const app = createApp(App);
app.use(createSmkb());
app.use(router);
app.mount("#app");
