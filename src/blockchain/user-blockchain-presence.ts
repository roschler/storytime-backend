// This module contains the code for the user blockchain object and
//  helper utilities.

import {
    getFriendlyChainIdName,
    Maybe,
    maybeTypeToString,
    NotifyUserFunction,
    NotifyUserMessages,
} from "./blockchain-common"

/**
 * WARNING: Keep this file in sync with the file of the same name
 *  between CLIENT and BACK-END server.
 */

// Verbose logging flag

export const bVerboseUserManagement = true;

const CONSOLE_CATEGORY = 'user-blockchain-presence';

/**
 * Class to maintain a user's blockchain details and facilitate transactions with MetaMask.
 *
 * WARNING: Keep the latest version of this class in sync with the
 *  back-end server!
 */
export class UserBlockchainPresence {

    // -------------------- BEGIN: DATA MEMBERS ------------

    public publicAddress = '';
    public chainId = '';
    public enforceChainId: string | null;

    // >>>>> STORY PROTOCOL

    // This is the user's primary Story Protocol Gateway
    //  NFT collection hash.
    public spgNftCollectionId = '';

    // -------------------- END  : DATA MEMBERS ------------

    constructor(enforceChainId: string | null) {
        this.enforceChainId = enforceChainId;
    }

    /**
     * Checks if MetaMask is installed in the browser.
     * @returns True if MetaMask is installed, false otherwise.
     */
    public isMetamaskInstalled(): boolean {
        const isInstalled =
            typeof window !== 'undefined' &&
            typeof window.ethereum !== 'undefined' &&
            window.ethereum?.isMetaMask === true;
        if (bVerboseUserManagement) {
            console.log(`isMetamaskInstalled: ${isInstalled}`);
        }
        return isInstalled;
    }

    /**
     * Checks if MetaMask wallet is available.
     * @returns True if MetaMask is ready, false otherwise.
     */
    public isMetamaskReady(): boolean {
        const isReady = this.isMetamaskInstalled();
        if (bVerboseUserManagement) {
            console.log(`isMetamaskReady: ${isReady}`);
        }
        return isReady;
    }

    /**
     * Checks if MetaMask is connected to our web app.
     * @returns True if connected, false otherwise.
     */
    public async isMetamaskConnected(): Promise<boolean | null | undefined> {
        if (!this.isMetamaskInstalled()) {
            if (bVerboseUserManagement) {
                console.log(`isMetamaskConnected: MetaMask is not installed.`);
            }
            return false;
        }
        try {
            const accounts = await window.ethereum?.request<string[]>({ method: 'eth_accounts' });
            const isConnected = accounts && accounts.length > 0;
            if (bVerboseUserManagement) {
                console.log(`isMetamaskConnected: ${isConnected}`);
            }
            return isConnected;
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`isMetamaskConnected error: ${errorMessage}`);
            }
            return false;
        }
    }

    /**
     * Connects to MetaMask.
     * @returns True if connected, false otherwise.
     */
    public async connectToMetamask(): Promise<boolean> {
        const isConnected = await this.isMetamaskConnected();
        if (isConnected) {
            if (bVerboseUserManagement) {
                console.log('connectToMetamask: Already connected to MetaMask.');
            }
            return true;
        }
        try {
            const accounts = await window.ethereum?.request<string[]>({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                if (bVerboseUserManagement) {
                    console.log('connectToMetamask: Successfully connected to MetaMask.');
                }
                return true;
            } else {
                if (bVerboseUserManagement) {
                    console.log('connectToMetamask: No accounts returned.');
                }
                return false;
            }
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`connectToMetamask error: ${errorMessage}`);
            }
            return false;
        }
    }

    /**
     * Gets the current chain ID from MetaMask.
     *
     * @returns The current chain ID.
     *
     * @throws Error if the operation fails.
     */
    public async getCurrentChainId(): Promise<Maybe<string>> {
        try {
            const chainId =
                await window.ethereum?.request<string>({ method: 'eth_chainId' });

            if (bVerboseUserManagement) {
                console.log(`getCurrentChainId: ${chainId} (${getFriendlyChainIdName(maybeTypeToString(chainId))})`);
            }
            return chainId;
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`getCurrentChainId error: ${errorMessage}`);
            }
            throw new Error(
                `Failed to get current chain ID: ${error instanceof Error ? error.message : String(error)}`
            );

        }
    }

    /**
     * Gets the current public address from MetaMask.
     * @returns The current public address.
     * @throws Error if the operation fails.
     */
    public async getCurrentPublicAddress(): Promise<string> {
        try {
            const accounts = await window.ethereum?.request<string[]>({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                const address = accounts[0];
                if (bVerboseUserManagement) {
                    console.log(`getCurrentPublicAddress: ${address}`);
                }

                if (typeof address !== 'string')
                    throw new Error(`The address returned is not a string.`);

                return address;
            } else {
                throw new Error('No accounts available.');
            }
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`getCurrentPublicAddress error: ${errorMessage}`);
            }
            throw new Error(
                `Failed to get current public address: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Switches to the specified chain ID in MetaMask.
     * @param newChainId - The chain ID to switch to.
     * @returns True if the switch was successful, false otherwise.
     * @throws Error if newChainId is invalid.
     */
    public async switchToChainId(newChainId: string): Promise<boolean> {
        if (!newChainId) {
            throw new Error('chainId cannot be empty.');
        }

        try {
            // Validate newChainId by attempting to get its friendly name
            const chainName = getFriendlyChainIdName(newChainId);
            if (bVerboseUserManagement) {
                console.log(`Attempting to switch to chain ID: ${newChainId} (${chainName})`);
            }
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`switchToChainId error: ${errorMessage}`);
            }
            throw new Error(`Invalid chain ID: ${newChainId}`);
        }

        try {
            await window.ethereum?.request<void>({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: newChainId }],
            });

            this.chainId = newChainId;

            if (bVerboseUserManagement) {
                console.log(`Switched to chain ID: ${newChainId} (${getFriendlyChainIdName(newChainId)})`);
            }

            // Get the current public address
            this.publicAddress = await this.getCurrentPublicAddress();

            return true;
        } catch (error: unknown) {
            if (bVerboseUserManagement) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`switchToChainId error: ${errorMessage}`);
            }
            return false;
        }
    }

    /**
     * Default implementation of doNotifyUser.
     * @param msgToUser - The message to display to the user.
     */
    private defaultDoNotifyUser(msgToUser: string): void {
        if (!msgToUser || msgToUser.trim() === '') {
            console.error('doNotifyUser: msgToUser cannot be empty.');
            return;
        }
        // Replace alert with a console log to avoid using alert in code
        console.log(`User notification: ${msgToUser}`);
    }

    /**
     * Performs a preflight check to ensure MetaMask is ready and connected.
     * @param doNotifyUser - Function to notify the user with messages.
     * @returns True if the preflight check is successful, false otherwise.
     */
    public async preflightCheck(
        doNotifyUser: NotifyUserFunction = this.defaultDoNotifyUser.bind(this)
    ): Promise<boolean> {
        const notify = doNotifyUser;

        // Check if MetaMask is installed
        if (!this.isMetamaskInstalled()) {
            notify(NotifyUserMessages.MetamaskNotInstalled);
            return false;
        }

        // Check if MetaMask is ready
        if (!this.isMetamaskReady()) {
            notify(NotifyUserMessages.MetamaskNotReady);
            return false;
        }

        // Check if MetaMask is connected
        const isConnected = await this.isMetamaskConnected();
        if (!isConnected) {
            const connected = await this.connectToMetamask();
            if (!connected) {
                notify(NotifyUserMessages.UnableToConnectMetamask);
                return false;
            }
        }

        // Get the current chain ID
        let currentChainId: string;

        try {
            const returnedChainId = await this.getCurrentChainId();

            if (typeof returnedChainId !== 'string')
                throw new Error(`Unable to get the current chain ID.`);

            currentChainId = returnedChainId
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            notify(`Failed to get current chain ID: ${errorMessage}`);
            return false;
        }

        // Handle enforceChainId
        if (this.enforceChainId) {
            if (currentChainId !== this.enforceChainId) {
                try {
                    const switched = await this.switchToChainId(this.enforceChainId);
                    if (!switched) {
                        const chainName = getFriendlyChainIdName(this.enforceChainId);
                        notify(NotifyUserMessages.WrongChainId + `${chainName}.`);
                        return false;
                    }
                } catch (error: unknown) {
                    const chainName = getFriendlyChainIdName(this.enforceChainId);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    notify(
                        NotifyUserMessages.WrongChainId + `${chainName}. Error details:\n${errorMessage}`
                    );
                    return false;
                }
            } else {
                this.chainId = currentChainId;
            }
        } else {
            this.chainId = currentChainId;
        }

        // Get current public address
        try {
            this.publicAddress = await this.getCurrentPublicAddress();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            notify(NotifyUserMessages.UnableToGetPublicAddress + errorMessage);
            return false;
        }

        // Preflight check successful
        if (bVerboseUserManagement) {
            console.log('preflightCheck: Successful.');
        }
        return true;
    }
}
