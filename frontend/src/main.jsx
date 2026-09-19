import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import store from "./redux/store.js";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <ToastContainer
          position="top-center"
          autoClose={1500}
          limit={1}
          newestOnTop
        />
      </BrowserRouter>
    </Provider>
    </HelmetProvider>
  </StrictMode>
);
