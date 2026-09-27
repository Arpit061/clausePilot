import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/layouts/AppLayout'
import { DocumentsPage } from '@/routes/DocumentsPage'
import { WorkspacePage } from '@/routes/WorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkspacePage /> },
      { path: 'documents', element: <DocumentsPage /> },
    ],
  },
])
