# Inventory and Data Management System
**Course:** Web Dev III | **Assignment:** 3 | **Unit:** 3

A REST API built with Node.js, Express.js, MongoDB, Mongoose and dotenv. It supports product CRUD, filtering, sorting, pagination, stock adjustment and inventory reports.

## 1. Requirements
- Node.js (LTS recommended)
- MongoDB Community Server running locally, or a MongoDB connection URI
- Postman (for testing)

## 2. Setup
Open this folder in VS Code / terminal and run:

```bash
npm install
```

Copy `.env.example` to `.env` and configure the database:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_management
NODE_ENV=development
```

Start the server:

```bash
npm run dev
```

or:

```bash
npm start
```

The server starts at `http://localhost:5000`. MongoDB must be running before starting the API.

## 3. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/products` | Create product |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get one product |
| PUT | `/api/products/:id` | Update product details |
| PATCH | `/api/products/:id/stock` | Restock / record sale |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/products/low-stock` | Low-stock report |
| GET | `/api/products/summary` | Category-wise aggregation |

### Create product
`POST http://localhost:5000/api/products`

Body (raw JSON):
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

### List, filter, sort and paginate
`GET http://localhost:5000/api/products?page=1&limit=10&category=Stationery&minPrice=50&maxPrice=500&search=pen&sort=price&order=asc`

All query parameters are optional:
- `category`: exact category (case-insensitive)
- `search`: searches name, SKU and supplier
- `minPrice`, `maxPrice`: price range
- `sort`: `name`, `price`, `quantity`, `category`, `createdAt`, `updatedAt`
- `order`: `asc` or `desc`
- `page`: page number (default 1)
- `limit`: results per page (default 10, maximum 100)

### Get one / update / delete
Replace `PRODUCT_ID` with the `_id` returned by MongoDB:
- `GET /api/products/PRODUCT_ID`
- `PUT /api/products/PRODUCT_ID`
- `DELETE /api/products/PRODUCT_ID`

Example PUT body:
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 140,
  "quantity": 60,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

### Stock adjustment
`PATCH /api/products/PRODUCT_ID/stock`

Restock:
```json
{ "change": 10 }
```
Sale:
```json
{ "change": -2 }
```
A sale that would make stock negative is rejected.

### Reports
- `GET /api/products/low-stock` returns products where `quantity <= reorderLevel`.
- `GET /api/products/summary` groups products by category and calculates item count, total quantity, total stock value and average price.

## 4. Validation and error handling
The Mongoose schema validates required fields, string lengths, non-negative price and stock, and whole-number quantity. SKU is unique. Centralized middleware handles validation errors, duplicate SKU errors, invalid MongoDB IDs, missing routes and server errors.

## 5. Suggested Postman testing order
1. Create two or more products with different categories.
2. Get all products; test category/search/price filters.
3. Test sorting and pagination.
4. Copy a returned `_id` and get that product.
5. Update the product using PUT.
6. Increase stock using PATCH with a positive `change`.
7. Decrease stock using PATCH with a negative `change`.
8. Try a sale larger than available stock and verify the 400 response.
9. Call the low-stock report.
10. Call the category summary.
11. Delete a product and verify it no longer appears.

## 6. Project structure
```text
Inventory-Data-Management-System/
├── middleware/
│   └── errorHandler.js
├── models/
│   └── Product.js
├── routes/
│   └── products.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Note
The supplied assignment PDF specifies the required features and shows Postman examples for the product APIs, low-stock report, category summary and stock adjustment. This implementation follows those requirements. Add your own Postman screenshots after running and testing it; screenshots cannot be truthfully pre-created without your local MongoDB data and test run.
