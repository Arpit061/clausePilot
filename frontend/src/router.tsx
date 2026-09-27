import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/layouts/AppLayout'
import { DocumentDetailPage } from '@/routes/DocumentDetailPage'
import { DocumentsPage } from '@/routes/DocumentsPage'
import { SearchPage } from '@/routes/SearchPage'
import { WorkspacePage } from '@/routes/WorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkspacePage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'documents/:id', element: <DocumentDetailPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
])
