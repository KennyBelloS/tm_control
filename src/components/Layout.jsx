import { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MenuContext = createContext(() => {});
export function useMenuToggle() {
  return useContext(MenuContext);
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <MenuContext.Provider value={() => setOpen(o => !o)}>
      <div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} />
      <Sidebar open={open} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
      <main className="main">
        <Outlet />
      </main>
    </MenuContext.Provider>
  );
}
