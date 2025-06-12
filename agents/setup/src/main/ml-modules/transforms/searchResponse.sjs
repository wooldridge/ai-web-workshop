/**
 * Mimics the JSON-specific logic in the Node middle tier's handlers.js module.
 * 
 * @param context 
 * @param params 
 * @param content 
 * @returns 
 */
function transform(context, params, content) {
  content = content.toObject()
  content.results.forEach(result => {
    if (result.hasOwnProperty("extracted")) {
      result.extracted = result.extracted.content[0]
    }
  })
  return content
};

module.exports = {
  transform
}
