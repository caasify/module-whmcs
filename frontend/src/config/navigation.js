export const dashboardNavItems = [
  {
    groupCode: 'overview',
    groupLabel: 'Overview',
    groupLabelKey: 'nav.groups.overview',
    items: [
      { label: 'Dashboard', labelKey: 'nav.items.dashboard', to: '/dashboard', icon: 'LayoutGrid' },
      { label: 'Servers List', labelKey: 'nav.items.servers', to: '/servers', icon: 'Server' },
      {
        label: 'AI API',
        labelKey: 'nav.items.aiApi',
        to: '/ai-api',
        icon: 'Cpu',
        disabled: true,
        tag: 'Soon',
        tagKey: 'nav.tags.soon',
      },
    ],
  },
  {
    groupCode: 'account',
    groupLabel: 'Account',
    groupLabelKey: 'nav.groups.account',
    items: [
      { label: 'Billing', labelKey: 'nav.items.billing', to: '/billing', icon: 'FileText' },
      { label: 'Add Funds', labelKey: 'nav.items.addFunds', to: '/billing/add-funds', icon: 'Wallet' },
      {
        label: 'Ticket List',
        labelKey: 'nav.items.tickets',
        to: '/support/tickets',
        icon: 'Ticket',
      },
      {
        label: 'Open Ticket',
        labelKey: 'nav.items.openTicket',
        nativeRouteKey: 'ticketCreateUrl',
        to: '/support/tickets/new',
        icon: 'Headset',
      },
    ],
  },
]
