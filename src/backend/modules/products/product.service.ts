
import {
  findActiveProductById,
  findProductImages,
  findActiveProductVariants,
  findVariantAttributes,
  findProductAttributeOptions,
} from "./product.repository";

export async function getProductById(id: string) {
  // 1. جلب المنتج الأساسي
  const product = await findActiveProductById(id);

  if (!product) {
    return null;
  }

  // 2. جلب الصور والمتغيرات وخيارات الخصائص بالتوازي
  const [images, variants, attributeOptions] = await Promise.all([
    findProductImages(product.id),
    findActiveProductVariants(product.id),
    findProductAttributeOptions(product.id),
  ]);

  // 3. جلب خصائص المتغيرات الفعلية
  const variantAttributes = await findVariantAttributes(
    variants.map((variant) => variant.id)
  );

  // 4. ربط الخصائص بكل متغير
  const variantsWithAttributes = variants.map((variant) => ({
    ...variant,

    // استخدام سعر المتغير إن وُجد، وإلا سعر المنتج
    price: variant.price ?? product.price,

    attributes: variantAttributes
      .filter((attribute) => attribute.variant_id === variant.id)
      .map((attribute) => ({
        id: attribute.attribute_id,
        name: attribute.attribute_name,
        value_id: attribute.attribute_value_id,
        value: attribute.attribute_value,
      })),
  }));

  // 5. تجميع خيارات الخصائص حسب الخاصية
  const attributesMap = new Map<
    string,
    {
      id: string;
      name: string;
      values: {
        id: string;
        value: string;
      }[];
    }
  >();

  for (const option of attributeOptions) {
    if (!attributesMap.has(option.attribute_id)) {
      attributesMap.set(option.attribute_id, {
        id: option.attribute_id,
        name: option.attribute_name,
        values: [],
      });
    }

    const attribute = attributesMap.get(option.attribute_id)!;

    // تجنب إضافة القيمة نفسها أكثر من مرة
    if (
      !attribute.values.some(
        (value) => value.id === option.attribute_value_id
      )
    ) {
      attribute.values.push({
        id: option.attribute_value_id,
        value: option.attribute_value,
      });
    }
  }

  // 6. إرجاع بيانات المنتج للواجهة
  return {
    ...product,
    images,
    attributes: Array.from(attributesMap.values()),
    variants: variantsWithAttributes,
  };
}