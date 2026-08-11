package main

import (
	"fmt"
	"os"

	"github.com/pocketbase/pocketbase"
	pbcmd "github.com/pocketbase/pocketbase/cmd"

	"github.com/asano69/epoche/internal/config"
	_ "github.com/asano69/epoche/migrations"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	// Loaded here only for cfg.Name, so the CLI's own name isn't
	// hardcoded separately from what "serve" reports.
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	app := pocketbase.NewWithConfig(pocketbase.Config{HideStartBanner: true})

	// Registers "<name> migrate up/down/create/collections/history-sync"
	// for manual or CI-driven schema management. Automigrate is off because
	// the schema is defined purely in Go migration files (internal/migrations),
	// not edited through the PocketBase dashboard.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: false,
	})

	root := app.RootCmd
	root.Use = epoche
	root.Short = epoche
	root.SilenceUsage = true
	root.Version = "0.0.1"

	root.AddCommand(

		serveCmd(app),
		pbcmd.NewSuperuserCommand(app),
	)

	if err := app.Execute(); err != nil {
		os.Exit(1)
	}
}
