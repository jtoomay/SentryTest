import { useState } from "react";
import * as Sentry from "@sentry/react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { MockApi } from "./pages/MockApi";
import { ErrorLab } from "./pages/ErrorLab";
import { Performance } from "./pages/Performance";
import { Context } from "./pages/Context";
import type { Persona } from "./personas";
import { sentryConfig } from "./instrument";

// Wrapping Routes lets Sentry name transactions after the route pattern.
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

export default function App() {
  const [persona, setPersona] = useState<Persona | null>(null);

  return (
    <div className="app">
      <nav className="nav">
        <span className="brand">🛰️ Sentry Showcase</span>
        <NavLink to="/" end>
          Overview
        </NavLink>
        <NavLink to="/api">Mock API</NavLink>
        <NavLink to="/errors">Error Lab</NavLink>
        <NavLink to="/performance">Performance</NavLink>
        <NavLink to="/context">Context & More</NavLink>
        <span className="persona">
          {persona ? `👤 ${persona.name}` : "Anonymous"}
        </span>
        {sentryConfig.projectUrl && (
          <a
            className="sentry-link"
            href={sentryConfig.projectUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Sentry ↗
          </a>
        )}
      </nav>

      <main>
        <SentryRoutes>
          <Route path="/" element={<Home />} />
          <Route path="/api" element={<MockApi />} />
          <Route path="/errors" element={<ErrorLab />} />
          <Route path="/performance" element={<Performance />} />
          <Route
            path="/context"
            element={<Context persona={persona} onPersonaChange={setPersona} />}
          />
          <Route
            path="*"
            element={
              <div className="page">
                <h1>Not found</h1>
              </div>
            }
          />
        </SentryRoutes>
      </main>
    </div>
  );
}
