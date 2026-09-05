// ── DealFlow360 – App Sidebar (shadcn pattern) ──

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Package, BarChart3,
  CreditCard, RefreshCw, Activity, ShoppingCart, LogOut, ChevronRight, DollarSign, Settings,
} from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from '../ui/sidebar.js';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu.js';

const ALL_INTERNAL: UserRole[] = [UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS];
const MANAGERS: UserRole[] = [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS];

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
  badge?: string;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Sales',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ALL_INTERNAL },
      { title: 'Customers', url: '/customers', icon: Users, roles: ALL_INTERNAL },
      { title: 'Quotations', url: '/quotations', icon: FileText, roles: ALL_INTERNAL },
      { title: 'Products', url: '/products', icon: ShoppingCart, roles: ALL_INTERNAL },
    ],
  },
  {
    title: 'Governance',
    items: [
      { title: 'Approvals', url: '/approvals', icon: CheckSquare, roles: MANAGERS },
      { title: 'Deal Health', url: '/deal-health', icon: Activity, roles: MANAGERS },
      { title: 'Configuration', url: '/configuration', icon: Settings, roles: [UserRole.ADMIN, UserRole.SALES_MANAGER] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { title: 'Fulfillment', url: '/fulfillment', icon: Package, roles: ALL_INTERNAL },
      { title: 'Subscriptions', url: '/subscriptions', icon: RefreshCw, roles: ALL_INTERNAL },
      { title: 'Invoices', url: '/invoices', icon: CreditCard, roles: ALL_INTERNAL },
    ],
  },
  {
    title: 'Insights',
    items: [
      { title: 'Reports', url: '/reports', icon: BarChart3, roles: MANAGERS },
    ],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <DollarSign className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DealFlow360</span>
                  <span className="truncate text-xs text-muted-foreground">Enterprise Sales</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(user.role as UserRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const isActive = item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url);

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.role.replace(/_/g, ' ')}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-white shadow-2xl"
                side="right"
                align="end"
                sideOffset={12}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
