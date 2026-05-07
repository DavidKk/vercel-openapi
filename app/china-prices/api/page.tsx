import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { getAuthSession } from '@/services/auth/session'

import { PricesApiPlayground } from './components'

/**
 * Prices API page with docs and interactive playground.
 * @returns API documentation and playground
 */
export default async function PricesApiPage() {
  const session = await getAuthSession()
  const canWrite = session.authenticated

  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 w-[85vw] min-w-[280px] flex-shrink-0 flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader
          title="Prices REST API"
          subtitle={
            canWrite ? 'Read-only endpoints + ADMIN-protected CURD endpoints' : 'Read-only endpoints for listing products, searching products, and calculating comparison results.'
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/prices/products" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>List all supported products. Optionally supports `?id=` to fetch one product.</p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/prices/products/search?q={keyword}" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Search public product data by keyword across name, brand, unit, and remark.</p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/prices/calc" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Calculate prices like overview. Body supports{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ productId | productName, totalPrice, totalQuantity, quantityUnit? }'}</code>.
            </p>
          </div>

          {canWrite ? (
            <>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="POST" path="/api/prices/products" enableCopy rightTag="admin" />
                <p className={DOC_ENDPOINT_DESC_CLASS}>Create a new price product (protected).</p>
              </div>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="PUT" path="/api/prices/products?id={id}" enableCopy rightTag="admin" />
                <p className={DOC_ENDPOINT_DESC_CLASS}>Update an existing product by id (protected).</p>
              </div>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="DELETE" path="/api/prices/products?id={id}" enableCopy rightTag="admin" />
                <p className={DOC_ENDPOINT_DESC_CLASS}>Delete a product by id (protected).</p>
              </div>
            </>
          ) : null}
          <h2 className={DOC_SECTION_TITLE_CLASS}>Notes</h2>
          <ul className="list-disc pl-4 text-[11px] text-gray-700">
            <li>List/search/calc endpoints are read-only and do not require login.</li>
            <li>ADMIN manage/write endpoints (CRUD) require login. They are shown here only after authentication.</li>
          </ul>
        </div>
      </section>

      <section className="flex h-full min-h-0 w-[85vw] min-w-[280px] flex-shrink-0 flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <PricesApiPlayground canWrite={canWrite} />
        </div>
      </section>
    </div>
  )
}
