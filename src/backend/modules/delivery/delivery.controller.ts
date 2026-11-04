
import type { NextRequest } from "next/server";

import {
  deliveryOptionsQuerySchema,

  createDeliveryCompanySchema,
  updateDeliveryCompanySchema,
  deliveryCompanyIdSchema,
  deliveryCompanyStatusSchema,

  createDeliveryOfficeSchema,
  updateDeliveryOfficeSchema,
  deliveryOfficeIdSchema,
  deliveryOfficeStatusSchema,

  createHomeDeliveryRateSchema,
  updateHomeDeliveryRateSchema,
  homeDeliveryRateIdSchema,

  createOfficeDeliveryRateSchema,
  updateOfficeDeliveryRateSchema,
  officeDeliveryRateIdSchema,

  deliveryRateStatusSchema,

  deliveryCompanyListQuerySchema,
  deliveryOfficeListQuerySchema,
  homeDeliveryRateListQuerySchema,
  officeDeliveryRateListQuerySchema,

  deliveryCommunesQuerySchema,
} from "./delivery.validation";

import {
  getDeliveryOptions,

  getAdminDeliveryCompanies,
  getAdminDeliveryCompanyById,
  createAdminDeliveryCompany,
  updateAdminDeliveryCompany,
  activateAdminDeliveryCompany,
  deactivateAdminDeliveryCompany,
  deleteAdminDeliveryCompany,

  getAdminDeliveryWilayas,
  getAdminDeliveryCommunes,

  getAdminDeliveryOffices,
  getAdminDeliveryOfficeById,
  createAdminDeliveryOffice,
  updateAdminDeliveryOffice,
  setAdminDeliveryOfficeActive,
  deleteAdminDeliveryOffice,

  getAdminHomeDeliveryRates,
  getAdminHomeDeliveryRateById,
  createAdminHomeDeliveryRate,
  updateAdminHomeDeliveryRate,
  setAdminHomeDeliveryRateActive,
  deleteAdminHomeDeliveryRate,

  getAdminOfficeDeliveryRates,
  getAdminOfficeDeliveryRateById,
  createAdminOfficeDeliveryRate,
  updateAdminOfficeDeliveryRate,
  setAdminOfficeDeliveryRateActive,
  deleteAdminOfficeDeliveryRate,
} from "./delivery.service";

import {
  successResponse,
  errorResponse,
  getErrorResponse,
} from "../../utils/http";

/* =========================================================
   HELPERS
========================================================= */

function handleDeliveryError(error: unknown): Response {
  return getErrorResponse(error);
}

function invalidRequest(): Response {
  return errorResponse(
    "INVALID_REQUEST_PARAMETERS",
    400
  );
}

/* =========================================================
   PUBLIC
   GET DELIVERY OPTIONS
========================================================= */

/**
 * GET /api/delivery
 *
 * Public delivery options.
 */
export async function getPublicDeliveryOptions(
  request: NextRequest
): Promise<Response> {
  try {
    const query = deliveryOptionsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!query.success) {
      return errorResponse(
        "INVALID_DELIVERY_QUERY_PARAMETERS",
        400
      );
    }

    const result = await getDeliveryOptions();

    if (!result) {
      return errorResponse(
        "NO_ACTIVE_DELIVERY_COMPANY",
        404
      );
    }

    return successResponse({
      code: "DELIVERY_OPTIONS_FETCHED",
      message: "Delivery options fetched successfully.",
      data: result,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/* =========================================================
   ADMIN
   DELIVERY COMPANIES
========================================================= */

/**
 * GET /api/admin/delivery/companies
 */
export async function getAdminDeliveryCompaniesController(
  request: NextRequest
): Promise<Response> {
  try {
    const query = deliveryCompanyListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!query.success) return invalidRequest();

    const companies = await getAdminDeliveryCompanies();

    return successResponse({
      code: "DELIVERY_COMPANIES_FETCHED",
      message: "Delivery companies fetched successfully.",
      data: companies,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * GET /api/admin/delivery/companies/:id
 */
export async function getAdminDeliveryCompanyController(
  id: string
): Promise<Response> {
  try {
    const params = deliveryCompanyIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const company = await getAdminDeliveryCompanyById(id);

    if (!company) {
      return errorResponse("DELIVERY_COMPANY_NOT_FOUND", 404);
    }

    return successResponse({
      code: "DELIVERY_COMPANY_FETCHED",
      message: "Delivery company fetched successfully.",
      data: company,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * POST /api/admin/delivery/companies
 */
export async function createAdminDeliveryCompanyController(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await request.json();

    const validation = createDeliveryCompanySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_COMPANY_DATA", 400);
    }

    const company = await createAdminDeliveryCompany(
      validation.data
    );

    return successResponse({
      code: "DELIVERY_COMPANY_CREATED",
      message: "Delivery company created successfully.",
      data: company,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/companies/:id
 */
export async function updateAdminDeliveryCompanyController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = deliveryCompanyIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = updateDeliveryCompanySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_COMPANY_DATA", 400);
    }

    const company = await updateAdminDeliveryCompany(
      id,
      validation.data
    );

    return successResponse({
      code: "DELIVERY_COMPANY_UPDATED",
      message: "Delivery company updated successfully.",
      data: company,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/companies/:id/status
 */
export async function updateAdminDeliveryCompanyStatusController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = deliveryCompanyIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = deliveryCompanyStatusSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_COMPANY_STATUS", 400);
    }

    const company = validation.data.is_active
      ? await activateAdminDeliveryCompany(id)
      : await deactivateAdminDeliveryCompany(id);

    return successResponse({
      code: "DELIVERY_COMPANY_STATUS_UPDATED",
      message: "Delivery company status updated successfully.",
      data: company,
    });
  } catch (error) {	  
    return handleDeliveryError(error);
  }
}

/**
 * DELETE /api/admin/delivery/companies/:id
 */
export async function deleteAdminDeliveryCompanyController(
  id: string
): Promise<Response> {
  try {
    const params = deliveryCompanyIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    await deleteAdminDeliveryCompany(id);

    return successResponse({
      code: "DELIVERY_COMPANY_DELETED",
      message: "Delivery company deleted successfully.",
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/* =========================================================
   ADMIN
   WILAYAS / COMMUNES
========================================================= */

/**
 * GET /api/admin/delivery/wilayas
 */
export async function getAdminDeliveryWilayasController(): Promise<Response> {
  try {
    const wilayas = await getAdminDeliveryWilayas();

    return successResponse({
      code: "DELIVERY_WILAYAS_FETCHED",
      message: "Wilayas fetched successfully.",
      data: wilayas,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * GET /api/admin/delivery/communes?wilaya_ids=id1,id2
 */
export async function getAdminDeliveryCommunesController(
  request: NextRequest
): Promise<Response> {
  try {
    const validation = deliveryCommunesQuerySchema.safeParse({
      wilaya_ids: request.nextUrl.searchParams.get("wilaya_ids"),
    });

    if (!validation.success) return invalidRequest();

    const communes = await getAdminDeliveryCommunes(
      validation.data.wilaya_ids
    );

    return successResponse({
      code: "DELIVERY_COMMUNES_FETCHED",
      message: "Communes fetched successfully.",
      data: communes,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/* =========================================================
   ADMIN
   DELIVERY OFFICES
========================================================= */

/**
 * GET /api/admin/delivery/offices
 */
export async function getAdminDeliveryOfficesController(
  request: NextRequest
): Promise<Response> {
  try {
    const validation = deliveryOfficeListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!validation.success) return invalidRequest();

    const offices = await getAdminDeliveryOffices(
      validation.data.delivery_company_id
    );

    return successResponse({
      code: "DELIVERY_OFFICES_FETCHED",
      message: "Delivery offices fetched successfully.",
      data: offices,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * GET /api/admin/delivery/offices/:id
 */
export async function getAdminDeliveryOfficeController(
  id: string
): Promise<Response> {
  try {
    const params = deliveryOfficeIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const office = await getAdminDeliveryOfficeById(id);

    if (!office) {
      return errorResponse("DELIVERY_OFFICE_NOT_FOUND", 404);
    }

    return successResponse({
      code: "DELIVERY_OFFICE_FETCHED",
      message: "Delivery office fetched successfully.",
      data: office,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * POST /api/admin/delivery/offices
 */
export async function createAdminDeliveryOfficeController(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await request.json();

    const validation = createDeliveryOfficeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_OFFICE_DATA", 400);
    }

    const office = await createAdminDeliveryOffice(
      validation.data
    );

    return successResponse({
      code: "DELIVERY_OFFICE_CREATED",
      message: "Delivery office created successfully.",
      data: office,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/offices/:id
 */
export async function updateAdminDeliveryOfficeController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = deliveryOfficeIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = updateDeliveryOfficeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_OFFICE_DATA", 400);
    }

    const office = await updateAdminDeliveryOffice(
      id,
      validation.data
    );

    return successResponse({
      code: "DELIVERY_OFFICE_UPDATED",
      message: "Delivery office updated successfully.",
      data: office,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/offices/:id/status
 */
export async function updateAdminDeliveryOfficeStatusController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = deliveryOfficeIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = deliveryOfficeStatusSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_DELIVERY_OFFICE_STATUS", 400);
    }

    const office = await setAdminDeliveryOfficeActive(
      id,
      validation.data.is_active
    );

    return successResponse({
      code: "DELIVERY_OFFICE_STATUS_UPDATED",
      message: "Delivery office status updated successfully.",
      data: office,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * DELETE /api/admin/delivery/offices/:id
 */
export async function deleteAdminDeliveryOfficeController(
  id: string
): Promise<Response> {
  try {
    const params = deliveryOfficeIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    await deleteAdminDeliveryOffice(id);

    return successResponse({
      code: "DELIVERY_OFFICE_DELETED",
      message: "Delivery office deleted successfully.",
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/* =========================================================
   ADMIN
   HOME DELIVERY RATES
========================================================= */

/**
 * GET /api/admin/delivery/home-rates
 */
export async function getAdminHomeDeliveryRatesController(
  request: NextRequest
): Promise<Response> {
  try {
    const validation = homeDeliveryRateListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!validation.success) return invalidRequest();

    const rates = await getAdminHomeDeliveryRates(
      validation.data.delivery_company_id
    );

    return successResponse({
      code: "HOME_DELIVERY_RATES_FETCHED",
      message: "Home delivery rates fetched successfully.",
      data: rates,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * GET /api/admin/delivery/home-rates/:id
 */
export async function getAdminHomeDeliveryRateController(
  id: string
): Promise<Response> {
  try {
    const params = homeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const rate = await getAdminHomeDeliveryRateById(id);

    if (!rate) {
      return errorResponse("HOME_DELIVERY_RATE_NOT_FOUND", 404);
    }

    return successResponse({
      code: "HOME_DELIVERY_RATE_FETCHED",
      message: "Home delivery rate fetched successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * POST /api/admin/delivery/home-rates
 */
export async function createAdminHomeDeliveryRateController(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await request.json();

    const validation = createHomeDeliveryRateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_HOME_DELIVERY_RATE_DATA", 400);
    }

    const rate = await createAdminHomeDeliveryRate(
      validation.data
    );

    return successResponse({
      code: "HOME_DELIVERY_RATE_CREATED",
      message: "Home delivery rate created successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/home-rates/:id
 */
export async function updateAdminHomeDeliveryRateController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = homeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = updateHomeDeliveryRateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_HOME_DELIVERY_RATE_DATA", 400);
    }

    const rate = await updateAdminHomeDeliveryRate(
      id,
      validation.data
    );

    return successResponse({
      code: "HOME_DELIVERY_RATE_UPDATED",
      message: "Home delivery rate updated successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/home-rates/:id/status
 */
export async function updateAdminHomeDeliveryRateStatusController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = homeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = deliveryRateStatusSchema.safeParse(body);

    if (!validation.success) return invalidRequest();

    const rate = await setAdminHomeDeliveryRateActive(
      id,
      validation.data.is_active
    );

    return successResponse({
      code: "HOME_DELIVERY_RATE_STATUS_UPDATED",
      message: "Home delivery rate status updated successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * DELETE /api/admin/delivery/home-rates/:id
 */
export async function deleteAdminHomeDeliveryRateController(
  id: string
): Promise<Response> {
  try {
    const params = homeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    await deleteAdminHomeDeliveryRate(id);

    return successResponse({
      code: "HOME_DELIVERY_RATE_DELETED",
      message: "Home delivery rate deleted successfully.",
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/* =========================================================
   ADMIN
   OFFICE DELIVERY RATES
========================================================= */

/**
 * GET /api/admin/delivery/office-rates
 */
export async function getAdminOfficeDeliveryRatesController(
  request: NextRequest
): Promise<Response> {
  try {
    const validation = officeDeliveryRateListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!validation.success) return invalidRequest();

    const rates = await getAdminOfficeDeliveryRates(
      validation.data.delivery_company_id
    );

    return successResponse({
      code: "OFFICE_DELIVERY_RATES_FETCHED",
      message: "Office delivery rates fetched successfully.",
      data: rates,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * GET /api/admin/delivery/office-rates/:id
 */
export async function getAdminOfficeDeliveryRateController(
  id: string
): Promise<Response> {
  try {
    const params = officeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const rate = await getAdminOfficeDeliveryRateById(id);

    if (!rate) {
      return errorResponse("OFFICE_DELIVERY_RATE_NOT_FOUND", 404);
    }

    return successResponse({
      code: "OFFICE_DELIVERY_RATE_FETCHED",
      message: "Office delivery rate fetched successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * POST /api/admin/delivery/office-rates
 */
export async function createAdminOfficeDeliveryRateController(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await request.json();

    const validation = createOfficeDeliveryRateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_OFFICE_DELIVERY_RATE_DATA", 400);
    }

    const rate = await createAdminOfficeDeliveryRate(
      validation.data
    );

    return successResponse({
      code: "OFFICE_DELIVERY_RATE_CREATED",
      message: "Office delivery rate created successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/office-rates/:id
 */
export async function updateAdminOfficeDeliveryRateController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = officeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = updateOfficeDeliveryRateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("INVALID_OFFICE_DELIVERY_RATE_DATA", 400);
    }

    const rate = await updateAdminOfficeDeliveryRate(
      id,
      validation.data
    );

    return successResponse({
      code: "OFFICE_DELIVERY_RATE_UPDATED",
      message: "Office delivery rate updated successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * PATCH /api/admin/delivery/office-rates/:id/status
 */
export async function updateAdminOfficeDeliveryRateStatusController(
  request: NextRequest,
  id: string
): Promise<Response> {
  try {
    const params = officeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    const body = await request.json();

    const validation = deliveryRateStatusSchema.safeParse(body);

    if (!validation.success) return invalidRequest();

    const rate = await setAdminOfficeDeliveryRateActive(
      id,
      validation.data.is_active
    );

    return successResponse({
      code: "OFFICE_DELIVERY_RATE_STATUS_UPDATED",
      message: "Office delivery rate status updated successfully.",
      data: rate,
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}

/**
 * DELETE /api/admin/delivery/office-rates/:id
 */
export async function deleteAdminOfficeDeliveryRateController(
  id: string
): Promise<Response> {
  try {
    const params = officeDeliveryRateIdSchema.safeParse({ id });

    if (!params.success) return invalidRequest();

    await deleteAdminOfficeDeliveryRate(id);

    return successResponse({
      code: "OFFICE_DELIVERY_RATE_DELETED",
      message: "Office delivery rate deleted successfully.",
    });
  } catch (error) {
    return handleDeliveryError(error);
  }
}
