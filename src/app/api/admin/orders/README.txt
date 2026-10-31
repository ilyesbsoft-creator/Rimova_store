RIMOVA STORE - ADMIN ORDER ROUTES

Copy the src folder in this archive into the root of your project.
The files will be placed under:
src/app/api/admin/orders/

Routes included:
GET     /api/admin/orders
GET     /api/admin/orders/[id]
PATCH   /api/admin/orders/[id]/status
PATCH   /api/admin/orders/[id]/customer
PATCH   /api/admin/orders/[id]/delivery
POST    /api/admin/orders/[id]/items
PATCH   /api/admin/orders/[id]/items/[itemId]
DELETE  /api/admin/orders/[id]/items/[itemId]
GET     /api/admin/orders/stats

All four roles are currently allowed:
super_admin, admin, manager, support

To change permissions, edit ALLOWED_ROLES in each route.ts file.

ASSUMPTIONS TO VERIFY:
1. The backend module path is:
   src/backend/modules/orders/order.controller.ts
   If your actual folder is named "order" (singular), update the
   "@/backend/modules/orders/" imports accordingly.
2. The requireAdmin file is:
   src/backend/modules/admin-auth/requireAdmin.ts
3. The controller exports have the names imported by these routes.
4. Each handler calls requireAdmin before its controller.

This archive contains route files only. It does not include repository,
service, validation, controller, or database files.
