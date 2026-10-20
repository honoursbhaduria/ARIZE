// Inline SVG so missing product images never hit a third-party service.
export const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#1d1d33"/>' +
      '<path d="M70 85h60l-6 50H76z" fill="none" stroke="#6e6c8f" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="M85 85a15 15 0 0 1 30 0" fill="none" stroke="#6e6c8f" stroke-width="6"/>' +
      '</svg>',
  )
