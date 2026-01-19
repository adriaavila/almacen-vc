```json
[
  {
    "category": "setup",
    "description": "Create Next.js project in the root of the folder",
    "steps": [
      "Initialize Next.js project in root directory",
      "Configure TypeScript",
      "Set up Tailwind CSS",
      "Verify project structure and dependencies",
      "Test that dev server runs successfully"
    ],
    "passes": true
  },
  {
    "category": "functional",
    "description": "User can choose role from home screen",
    "steps": [
      "Navigate to root URL '/'",
      "View role selection screen",
      "Click 'Entrar como Solicitante'",
      "Verify navigation to /requester/pedido"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Requester can create a new internal order",
    "steps": [
      "Navigate to /requester/pedido",
      "View list of available items",
      "Enter quantities for one or more items",
      "Click 'Enviar pedido'",
      "Verify order is created with status 'pendiente'"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Requester can view their submitted orders",
    "steps": [
      "Navigate to /requester/mis-pedidos",
      "View list of previously created orders",
      "Verify each order shows date and status"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Admin can view all pending orders",
    "steps": [
      "Navigate to /admin/pedidos",
      "View table of orders",
      "Verify only orders with status 'pendiente' are shown",
      "Select an order to view details"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Admin can deliver an order",
    "steps": [
      "Navigate to an order detail page",
      "Review list of items and quantities",
      "Click 'Marcar como entregado'",
      "Verify order status changes to 'entregado'"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Stock is discounted when order is delivered",
    "steps": [
      "Deliver an order as admin",
      "Navigate to /admin/inventario",
      "Locate items from the delivered order",
      "Verify stock values are reduced correctly"
    ],
    "passes": false
  },
  {
    "category": "functional",
    "description": "Inventory items show low stock alerts",
    "steps": [
      "Navigate to /admin/inventario",
      "Review inventory table",
      "Identify items where stock <= stock mínimo",
      "Verify low stock items are visually highlighted"
    ],
    "passes": false
  },
  {
    "category": "ui",
    "description": "UI follows defined design system",
    "steps": [
      "Verify primary actions use emerald green (#10b981)",
      "Verify secondary actions use teal (#14b8a6)",
      "Check typography uses Inter font",
      "Confirm consistent spacing and rounded corners",
      "Verify buttons use defined variants"
    ],
    "passes": false
  },
  {
    "category": "ux",
    "description": "Core workflow is understandable without explanation",
    "steps": [
      "Enter app as requester",
      "Create an order without guidance",
      "Switch to admin role",
      "Deliver the order",
      "Confirm workflow feels intuitive"
    ],
    "passes": false
  }
]
```