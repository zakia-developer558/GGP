import { Router } from "express";
import productController, { updatePublisherProductController } from "../../controllers/product.controller";
import { Others } from "../../enums/others.enum";
import { authorizeRole } from "../../middlewares/role.middleware";
import { authenticateJWT } from "../../middlewares/auth.middleware";
import { SitemapStream, streamToPromise } from "sitemap";
import { createGzip } from "zlib";
import { Product } from "../../models/product";
import { ProductRepository } from "../../repositories";
import { generateSitemaps } from "../../services/product.service";
import { Pool } from "pg";

const productRouter = Router();

productRouter.post("/create/product", authenticateJWT,authorizeRole(Others.role.PUBLISHER) , productController.createProduct);
productRouter.get("/products", authenticateJWT,authorizeRole(Others.role.PUBLISHER), productController.getProducts);
productRouter.put("/update/product/:id",authenticateJWT ,authorizeRole(Others.role.PUBLISHER), productController.updateProduct);
productRouter.delete("/delete/product/:productId",authenticateJWT , authorizeRole(Others.role.PUBLISHER), productController.deleteProducts);
productRouter.post("/submit-post/:id", authenticateJWT, authorizeRole(Others.role.PUBLISHER), productController.submitPost);
productRouter.get('/products/postPending', authenticateJWT, authorizeRole(Others.role.PUBLISHER), productController.getPendingProducts);
// user get all products
productRouter.get("/get/products",   productController.getAllProductsUsers);
productRouter.get("/products/unapproved",authenticateJWT,authorizeRole(Others.role.PUBLISHER, Others.role.MODERATOR),productController.getUnapprovedProducts);
productRouter.put("/admin-update/:productId", authenticateJWT, updatePublisherProductController);
productRouter.get("/generate", generateSitemaps);

//route for live updates from google sheets
const pool = new Pool({
    user: process.env.DATABASE_USERNAME,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Google Sheets Sync Endpoint
  productRouter.post("/sync-from-sheets", authenticateJWT, authorizeRole(Others.role.MODERATOR), async (req, res) => {
    // Input validation
    if (!req.body || !Array.isArray(req.body.data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
  
    const user = req.user
  
    const { sheet, row, data } = req.body;
    
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
       const query = `
    INSERT INTO Product (
      site_name, 
      price, 
      language, 
      country, 
      category, 
      currency, 
      niche, 
      approx_publication_time, 
      website_url, 
      site_type, 
      sample_link, 
      live_time, 
      link_type, 
      max_link_allowed, 
      word_limit, 
      domain_authority, 
      domain_ratings, 
      monthly_traffic, 
      turn_around_time, 
      adjusted_price, 
      is_product_approve, 
      product_status, 
      "user"
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    )
    ON CONFLICT (website_url) 
    DO UPDATE SET 
      site_name = EXCLUDED.site_name,
      price = EXCLUDED.price,
      language = EXCLUDED.language,
      country = EXCLUDED.country,
      category = EXCLUDED.category,
      currency = EXCLUDED.currency,
      niche = EXCLUDED.niche,
      approx_publication_time = EXCLUDED.approx_publication_time,
      site_type = EXCLUDED.site_type,
      sample_link = EXCLUDED.sample_link,
      live_time = EXCLUDED.live_time,
      link_type = EXCLUDED.link_type,
      max_link_allowed = EXCLUDED.max_link_allowed,
      word_limit = EXCLUDED.word_limit,
      domain_authority = EXCLUDED.domain_authority,
      domain_ratings = EXCLUDED.domain_ratings,
      monthly_traffic = EXCLUDED.monthly_traffic,
      turn_around_time = EXCLUDED.turn_around_time,
      adjusted_price = EXCLUDED.adjusted_price,
      is_product_approve = EXCLUDED.is_product_approve,
      product_status = EXCLUDED.product_status,
      "user" = EXCLUDED."user"
    RETURNING website_url`;
  
        
       const result = await client.query(query, [
    row[0], // site_name
    parseFloat(row[1]), // price directly from row
    row[2], // language
    row[3], // country
    row[4]?.split(",").map((item: string) => item.trim()),//category
    row[5], // currency
    row[6], // niche
    row[7], // approx_publication_time
    row[8], // website_url
    row[9] || "newPost", // site_type
    row[10], // sample_link
    row[11] || null, // live_time
    row[12], // link_type directly from row
    row[13], // max_link_allowed
    row[14], // word_limit
    parseInt(row[15], 10) || 0, // domain_authority
    parseFloat(row[16]) || 0, // domain_ratings
    parseInt(row[17], 10) || 0, // monthly_traffic
    "2 days", // turn_around_time
    parseFloat(row[1]) * 1.25, // adjusted_price calculated from price
    true, // is_product_approve
    Others.productstatus.APPROVED, // product_status
    user // user
  ]);
  
        
        await client.query('COMMIT');
        res.status(200).json({ 
          success: true,
          updatedId: result.rows[0]?.id 
        });
      } catch (queryError) {
        await client.query('ROLLBACK');
        throw queryError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
    success: false,
    error: 'Database operation failed',
    details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
  });
  
    }
  });

export default productRouter;



