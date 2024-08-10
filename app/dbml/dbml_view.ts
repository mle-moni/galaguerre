export const dbmlView = async () => {
    return `
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html>
  <head>
    <title>Models</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    </style>

    <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.5.0/dist/svg-pan-zoom.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  </head>

  <body>
    <embed src="/dbml/models.svg" type="image/svg+xml" id="svg-embed" style="width: 100%; height: 100%;" />
    <script>
      const svg = document.getElementById('svg-embed')
      svg.onload = () => {
        svgPanZoom(svg, {
          zoomEnabled: true,
          minZoom: 0.1,
          maxZoom: 10,
          zoomScaleSensitivity: 0.5
        })
      }
    </script>

  </body>
</html>`;
};
