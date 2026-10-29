import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { getProductById } from "@/backend/modules/products/product.service";
import { getDeliveryOptions } from "@/backend/modules/delivery/delivery.service";
import ProductLanding from "@/app/components/product/product-landing";
import ProductLoading from "@/app/components/product/product-loading";

type ProductPageProps = {
    params: Promise<{ id: string }>;
};

type ProductContentProps = {
    params: Promise<{ id: string }>;
};

async function ProductContent({ params }: ProductContentProps) {
    // انتظر الاتصال الديناميكي قبل الاستعلام
    await connection();

    // استخراج معرف المنتج
    const { id } = await params;

    // جلب المنتج من قاعدة البيانات
    const [product, deliveryOptions] = await Promise.all([
        getProductById(id),
        getDeliveryOptions(),
    ]);

    // إظهار صفحة 404 عند عدم وجود المنتج
    if (!product) {
        notFound();
    }

    // عرض صفحة المنتج
    return (
        <ProductLanding product={product} deliveryOptions={deliveryOptions} />
    );
}

export default function ProductPage({ params }: ProductPageProps) {
    return (
        <Suspense fallback={<ProductLoading />}>
            <ProductContent params={params} />
        </Suspense>
    );
}
