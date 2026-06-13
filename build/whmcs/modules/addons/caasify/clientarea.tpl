{if $cloudhubMode eq 'publicPricingFrame'}
  <style>
    .caasify-public-pricing-body .caasify-public-pricing-container {
      width: 100% !important;
      max-width: none !important;
    }

    .caasify-public-pricing-body .caasify-public-pricing-content {
      width: 100% !important;
      max-width: 100% !important;
      flex: 0 0 100% !important;
      float: none !important;
      margin-inline: 0 !important;
    }

    .caasify-public-pricing-body .caasify-public-pricing-sidebar {
      display: none !important;
    }

    .caasify-public-pricing-body .outer-wrapper,
    .caasify-public-pricing-body .inner-wrapper,
    .caasify-public-pricing-body #fullpage-overlay {
      display: none !important;
    }

    [data-caasify-pricing-shell] {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      margin: 0;
      padding: 0;
      display: block;
    }

    [data-caasify-pricing-shell] iframe {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 720px;
      border: 0;
      display: block;
      background: transparent;
      overflow: hidden;
    }
  </style>

  <div data-caasify-pricing-shell>
    <iframe
      id="{$cloudhubPricingFrameId|escape:'htmlall':'UTF-8'}"
      src="{$cloudhubPricingFrameSrc|escape:'htmlall':'UTF-8'}"
      loading="eager"
      referrerpolicy="same-origin"
    ></iframe>
  </div>

  <script>
    (function () {
      var body = document.body;
      var shell = document.querySelector('[data-caasify-pricing-shell]');
      var ancestor = null;

      if (body) {
        body.classList.add('caasify-public-pricing-body');
      }

      if (shell) {
        ancestor = shell.parentElement;

        while (ancestor) {
          if (ancestor.classList) {
            if (
              ancestor.classList.contains('container')
              || ancestor.classList.contains('container-fluid')
            ) {
              ancestor.classList.add('caasify-public-pricing-container');
            }

            if (
              ancestor.classList.contains('main-content')
              || /\bcol-(xs|sm|md|lg|xl|xxl)-\d+\b/.test(ancestor.className || '')
            ) {
              ancestor.classList.add('caasify-public-pricing-content');
            }
          }

          ancestor = ancestor.parentElement;
        }
      }

      document.querySelectorAll('.sidebar, #primary-sidebar, #secondary-sidebar').forEach(function (node) {
        node.classList.add('caasify-public-pricing-sidebar');
      });

      if (window.__caasifyPublicPricingFrameListenerAttached) {
        return;
      }

      window.__caasifyPublicPricingFrameListenerAttached = true;

      window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) {
          return;
        }

        var payload = event.data || {};

        if (payload.type !== 'caasify-public-pricing:resize') {
          return;
        }

        var frame = document.getElementById(payload.frameId);

        if (!frame || !payload.height) {
          return;
        }

        var nextHeight = Number(payload.height);

        if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
          return;
        }

        var targetHeight = Math.max(720, Math.ceil(nextHeight));
        var currentHeight = Number(frame.getAttribute('data-caasifyHeight') || 0);

        if (Math.abs(currentHeight - targetHeight) < 2) {
          return;
        }

        frame.style.height = targetHeight + 'px';
        frame.setAttribute('data-caasifyHeight', String(targetHeight));
      });
    }());
  </script>
{else}
  <script>
    window.location.replace("{$cloudhubLaunchUrl|escape:'javascript'}");
  </script>

  <div style="padding: 24px; border: 1px solid #dbe3ef; border-radius: 16px; background: #fff;">
    <h2 style="margin: 0 0 12px;">Opening {$cloudhubBrandName|default:'Dashboard'|escape:'htmlall':'UTF-8'}...</h2>
    <p style="margin: 0; color: #526277;">
      If you are not redirected automatically,
      <a href="{$cloudhubLaunchUrl|escape:'htmlall':'UTF-8'}" style="color: #1d54d6;">continue to {$cloudhubBrandName|default:'the dashboard'|escape:'htmlall':'UTF-8'}</a>.
    </p>
  </div>
{/if}
