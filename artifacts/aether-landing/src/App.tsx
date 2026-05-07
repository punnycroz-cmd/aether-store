import { Router, Route, Switch } from 'wouter';
import { LandingPage }        from './pages/LandingPage';
import { ForgePage }          from './pages/ForgePage';
import { VaultPage }          from './pages/VaultPage';
import { DiscoverPage }       from './pages/DiscoverPage';
import { StorePage }          from './pages/StorePage';
import { ProfilePage }        from './pages/ProfilePage';
import { ChallengesPage }     from './pages/ChallengesPage';
import { CreatorProfilePage } from './pages/CreatorProfilePage';
import { PromptCagePage }     from './pages/PromptCagePage';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <Router base={base}>
      <Switch>
        <Route path="/forge"               component={ForgePage}           />
        <Route path="/vault"               component={VaultPage}           />
        <Route path="/discover"            component={DiscoverPage}        />
        <Route path="/feed"                component={DiscoverPage}        />
        <Route path="/store"               component={StorePage}           />
        <Route path="/profile"             component={ProfilePage}         />
        <Route path="/profile/:username"   component={CreatorProfilePage}  />
        <Route path="/challenges"          component={ChallengesPage}      />
        <Route path="/cage"                component={PromptCagePage}      />
        <Route                             component={LandingPage}         />
      </Switch>
    </Router>
  );
}
