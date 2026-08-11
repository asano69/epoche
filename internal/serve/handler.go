package serve

import (
	"github.com/asano69/my-mind/internal/version"
)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/api/version", func(e *core.RequestEvent) error {
			return e.JSON(http.StatusOK, map[string]string{"version": version.Version})
		})

		
		e.Router.GET("/health", func(e *core.RequestEvent) error {



}

//func importFoldersHandler(app *pocketbase.PocketBase, cfg *config.Config) func(re *core.RequestEvent) error
