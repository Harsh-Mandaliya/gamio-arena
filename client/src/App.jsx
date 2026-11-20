import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import RequireRole from './auth/RequireRole.jsx';
import PageLoader from './components/PageLoader.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AccountLayout from './pages/account/AccountLayout.jsx';
import BookingDetail from './pages/account/BookingDetail.jsx';
import MyBookings from './pages/account/MyBookings.jsx';
import Profile from './pages/account/Profile.jsx';
import Wallet from './pages/account/Wallet.jsx';
import Contact from './pages/site/Contact.jsx';
import Explore from './pages/site/Explore.jsx';
import Home from './pages/site/Home.jsx';
import NotFound from './pages/site/NotFound.jsx';
import SignIn from './pages/site/SignIn.jsx';
import SignUp from './pages/site/SignUp.jsx';
import Venue from './pages/site/Venue.jsx';

// The console is only for staff, so players never download it.
const ConsoleLayout = lazy(() => import('./layouts/ConsoleLayout.jsx'));
const Overview = lazy(() => import('./pages/console/Overview.jsx'));
const FrontDesk = lazy(() => import('./pages/console/FrontDesk.jsx'));
const Bookings = lazy(() => import('./pages/console/Bookings.jsx'));
const Wallets = lazy(() => import('./pages/console/Wallets.jsx'));
const Venues = lazy(() => import('./pages/console/Venues.jsx'));
const People = lazy(() => import('./pages/console/People.jsx'));
const GameTypes = lazy(() => import('./pages/console/GameTypes.jsx'));
const Inbox = lazy(() => import('./pages/console/Inbox.jsx'));
const ActivityLog = lazy(() => import('./pages/console/ActivityLog.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="play" element={<Explore mode="play" />} />
          <Route path="venues" element={<Explore mode="venues" />} />
          <Route path="venues/:slug" element={<Venue />} />
          <Route path="contact" element={<Contact />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="sign-up" element={<SignUp />} />

          <Route
            path="me"
            element={
              <RequireRole>
                <AccountLayout />
              </RequireRole>
            }
          >
            <Route path="bookings" element={<MyBookings />} />
            <Route path="bookings/:code" element={<BookingDetail />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="console"
          element={
            <RequireRole role="staff">
              <ConsoleLayout />
            </RequireRole>
          }
        >
          <Route index element={<Overview />} />
          <Route path="desk" element={<FrontDesk />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="venues" element={<RequireRole role="manager"><Venues /></RequireRole>} />
          <Route path="people" element={<RequireRole role="admin"><People /></RequireRole>} />
          <Route path="games" element={<RequireRole role="admin"><GameTypes /></RequireRole>} />
          <Route path="inbox" element={<RequireRole role="admin"><Inbox /></RequireRole>} />
          <Route path="activity" element={<RequireRole role="admin"><ActivityLog /></RequireRole>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
