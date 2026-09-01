module.exports = function(eleventyConfig) {
  // Pass the admin folder directly to the build
  eleventyConfig.addPassthroughCopy("src/admin");
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};