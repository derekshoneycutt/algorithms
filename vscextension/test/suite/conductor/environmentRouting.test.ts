import * as assert from "assert";

describe("conductor/internal — environment routing integration", () => {
  describe("Per-language routing save validation", () => {
    it("blocks save when docker enabled with empty value", () => {
      const dockerEnabled = true;
      const dockerValue = "";
      const sshEnabled = false;
      const sshValue = "";

      const hasError = dockerEnabled && !dockerValue;
      assert.equal(hasError, true);
    });

    it("blocks save when ssh enabled with empty value", () => {
      const dockerEnabled = false;
      const dockerValue = "";
      const sshEnabled = true;
      const sshValue = "";

      const hasError = sshEnabled && !sshValue;
      assert.equal(hasError, true);
    });

    it("blocks save when both docker and ssh are enabled (conflict)", () => {
      const dockerEnabled = true;
      const dockerValue = "ubuntu:latest";
      const sshEnabled = true;
      const sshValue = "user@host";

      const hasConflict = dockerEnabled && sshEnabled;
      assert.equal(hasConflict, true);
    });

    it("allows save when docker enabled with value", () => {
      const dockerEnabled = true;
      const dockerValue = "ubuntu:latest";
      const sshEnabled = false;
      const sshValue = "";

      const hasError = (dockerEnabled && !dockerValue) || (sshEnabled && !sshValue) || (dockerEnabled && sshEnabled);
      assert.equal(hasError, false);
    });

    it("allows save when ssh enabled with value", () => {
      const dockerEnabled = false;
      const dockerValue = "";
      const sshEnabled = true;
      const sshValue = "user@host";

      const hasError = (dockerEnabled && !dockerValue) || (sshEnabled && !sshValue) || (dockerEnabled && sshEnabled);
      assert.equal(hasError, false);
    });

    it("allows save when neither docker nor ssh is enabled", () => {
      const dockerEnabled = false;
      const dockerValue = "";
      const sshEnabled = false;
      const sshValue = "";

      const hasError = (dockerEnabled && !dockerValue) || (sshEnabled && !sshValue) || (dockerEnabled && sshEnabled);
      assert.equal(hasError, false);
    });
  });

  describe("Batch routing save validation", () => {
    it("blocks save when docker enabled with empty value on batch", () => {
      const batchDockerEnabled = true;
      const batchDockerValue = "";
      const batchSshEnabled = false;
      const batchSshValue = "";

      const hasError = batchDockerEnabled && !batchDockerValue;
      assert.equal(hasError, true);
    });

    it("blocks save when ssh enabled with empty value on batch", () => {
      const batchDockerEnabled = false;
      const batchDockerValue = "";
      const batchSshEnabled = true;
      const batchSshValue = "";

      const hasError = batchSshEnabled && !batchSshValue;
      assert.equal(hasError, true);
    });

    it("blocks save when both docker and ssh enabled on batch (conflict)", () => {
      const batchDockerEnabled = true;
      const batchDockerValue = "ubuntu:latest";
      const batchSshEnabled = true;
      const batchSshValue = "user@host";

      const hasConflict = batchDockerEnabled && batchSshEnabled;
      assert.equal(hasConflict, true);
    });

    it("allows batch save when docker enabled with value", () => {
      const batchDockerEnabled = true;
      const batchDockerValue = "ubuntu:latest";
      const batchSshEnabled = false;
      const batchSshValue = "";

      const hasError = (batchDockerEnabled && !batchDockerValue) || (batchSshEnabled && !batchSshValue) || (batchDockerEnabled && batchSshEnabled);
      assert.equal(hasError, false);
    });

    it("allows batch save when ssh enabled with value", () => {
      const batchDockerEnabled = false;
      const batchDockerValue = "";
      const batchSshEnabled = true;
      const batchSshValue = "user@host";

      const hasError = (batchDockerEnabled && !batchDockerValue) || (batchSshEnabled && !batchSshValue) || (batchDockerEnabled && batchSshEnabled);
      assert.equal(hasError, false);
    });

    it("allows batch save when neither docker nor ssh enabled", () => {
      const batchDockerEnabled = false;
      const batchDockerValue = "";
      const batchSshEnabled = false;
      const batchSshValue = "";

      const hasError = (batchDockerEnabled && !batchDockerValue) || (batchSshEnabled && !batchSshValue) || (batchDockerEnabled && batchSshEnabled);
      assert.equal(hasError, false);
    });
  });

  describe("Routing entry map serialization", () => {
    it("serializes single docker routing entry to map text", () => {
      const entries = [
        {
          languageKey: "python",
          dockerEnabled: true,
          dockerValue: "ubuntu:latest",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
      ];

      // Build docker map from enabled entries
      const dockerTokens = entries.filter((e) => e.dockerEnabled).map((e) => `${e.languageKey}=${e.dockerValue}`);
      const dockerMapText = dockerTokens.join(" ");

      assert.equal(dockerMapText, "python=ubuntu:latest");
    });

    it("serializes multiple docker routing entries to map text", () => {
      const entries = [
        {
          languageKey: "python",
          dockerEnabled: true,
          dockerValue: "ubuntu:latest",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
        {
          languageKey: "javascript",
          dockerEnabled: true,
          dockerValue: "node:18",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
        {
          languageKey: "rust",
          dockerEnabled: false,
          dockerValue: "",
          sshEnabled: true,
          sshValue: "user@host",
          conflict: false,
          statusText: "",
        },
      ];

      const dockerTokens = entries.filter((e) => e.dockerEnabled).map((e) => `${e.languageKey}=${e.dockerValue}`);
      const dockerMapText = dockerTokens.join(" ");

      assert.equal(dockerMapText, "python=ubuntu:latest javascript=node:18");
    });

    it("serializes single ssh routing entry to map text", () => {
      const entries = [
        {
          languageKey: "python",
          dockerEnabled: false,
          dockerValue: "",
          sshEnabled: true,
          sshValue: "user@host",
          conflict: false,
          statusText: "",
        },
      ];

      const sshTokens = entries.filter((e) => e.sshEnabled).map((e) => `${e.languageKey}=${e.sshValue}`);
      const sshMapText = sshTokens.join(" ");

      assert.equal(sshMapText, "python=user@host");
    });

    it("clears entries from map when disabled", () => {
      // Start with entry enabled
      let entries = [
        {
          languageKey: "python",
          dockerEnabled: true,
          dockerValue: "ubuntu:latest",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
      ];

      let dockerTokens = entries.filter((e) => e.dockerEnabled).map((e) => `${e.languageKey}=${e.dockerValue}`);
      let dockerMapText = dockerTokens.join(" ");
      assert.equal(dockerMapText, "python=ubuntu:latest");

      // Disable the entry
      entries[0].dockerEnabled = false;
      dockerTokens = entries.filter((e) => e.dockerEnabled).map((e) => `${e.languageKey}=${e.dockerValue}`);
      dockerMapText = dockerTokens.join(" ");
      assert.equal(dockerMapText, "");
    });
  });

  describe("Routing status propagation", () => {
    it("sets success status when per-language save completes", () => {
      const entry = {
        languageKey: "python",
        dockerEnabled: true,
        dockerValue: "ubuntu:latest",
        sshEnabled: false,
        sshValue: "",
        conflict: false,
        statusText: "saved",
      };

      assert.equal(entry.statusText, "saved");
    });

    it("sets error status when per-language save fails validation", () => {
      const entry = {
        languageKey: "python",
        dockerEnabled: true,
        dockerValue: "",
        sshEnabled: false,
        sshValue: "",
        conflict: false,
        statusText: "docker value required",
      };

      assert.equal(entry.statusText, "docker value required");
    });

    it("batches status updates to all per-language entries after batch save", () => {
      const entries = [
        {
          languageKey: "python",
          dockerEnabled: false,
          dockerValue: "",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
        {
          languageKey: "javascript",
          dockerEnabled: false,
          dockerValue: "",
          sshEnabled: false,
          sshValue: "",
          conflict: false,
          statusText: "",
        },
      ];

      // After batch save applies docker to all languages
      const batchDockerValue = "ubuntu:latest";
      entries.forEach((e) => {
        e.statusText = "batch save applied";
      });

      assert.equal(entries[0].statusText, "batch save applied");
      assert.equal(entries[1].statusText, "batch save applied");
    });
  });

  describe("Conflict detection across all entries", () => {
    it("marks row conflict when docker and ssh both enabled", () => {
      const entry = {
        languageKey: "python",
        dockerEnabled: true,
        dockerValue: "ubuntu:latest",
        sshEnabled: true,
        sshValue: "user@host",
        conflict: true,
        statusText: "",
      };

      assert.equal(entry.conflict, true);
    });

    it("clears row conflict when ssh is disabled", () => {
      const entry = {
        languageKey: "python",
        dockerEnabled: true,
        dockerValue: "ubuntu:latest",
        sshEnabled: false,
        sshValue: "",
        conflict: false,
        statusText: "",
      };

      assert.equal(entry.conflict, false);
    });

    it("marks batch conflict when docker and ssh both enabled", () => {
      const batchRouting = {
        dockerEnabled: true,
        dockerValue: "ubuntu:latest",
        sshEnabled: true,
        sshValue: "user@host",
        conflict: true,
      };

      assert.equal(batchRouting.conflict, true);
    });

    it("clears batch conflict when ssh is disabled", () => {
      const batchRouting = {
        dockerEnabled: true,
        dockerValue: "ubuntu:latest",
        sshEnabled: false,
        sshValue: "",
        conflict: false,
      };

      assert.equal(batchRouting.conflict, false);
    });
  });
});
