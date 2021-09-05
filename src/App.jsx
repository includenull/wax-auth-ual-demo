import React, {useState} from 'react';
import {withUAL} from 'ual-reactjs-renderer/dist/components/provider/withUAL';
import {RpcError} from 'eosjs';

const App = (props) => {
    const [loggedIn, setLoggedIn] = useState(false);
    // URL for the wax-auth server
    const serverUrl = "http://localhost:3000";

    const login = () => {
        setLoggedIn(false);
        props.ual.logout();
        props.ual.showModal();
    }

    const logout = () => {
        setLoggedIn(false);
        props.ual.logout();
    }

    const authGetNonce = async () => {
        const { ual: { activeUser } } = props;
        const { accountName } = activeUser;

        let response = await fetch(serverUrl + '/getNonce', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                waxAddress: accountName
            })
        });

        return (await response.json()).nonce;
    }

    const authVerify = async (nonce) => {
        const { ual: { activeUser } } = props;

        const { accountName } = activeUser;
        let { requestPermission } = activeUser;
        if (!requestPermission && activeUser.scatter) {
            // workaround for scatter
            requestPermission = activeUser.scatter.identity.accounts[0].authority;
        }

        // submit the transaction, do not broadcast
        const tx = await activeUser.signTransaction({
            actions: [{
                account: "orng.wax",
                name: "requestrand",
                authorization: [
                    {
                        actor: accountName,
                        permission: requestPermission,
                    }
                ],
                data: {
                    caller: accountName,
                    signing_value: nonce,
                    assoc_id: nonce,
                }
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
            broadcast: false,
            sign: true,
        });

        // send the signed transaction data to verify
        await fetch(serverUrl + '/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serializedTransaction: tx.transaction.serializedTransaction,
                signatures: tx.transaction.signatures,
            })
        });

        return true;
    }

    const verifyTransaction = async () => {
        try {
            const nonce = await authGetNonce();
            await authVerify(nonce);
            setLoggedIn(true);
        } catch (e) {
            console.error(e);
            if (e instanceof RpcError)
                console.log(JSON.stringify(e.json, null, 2));
        }
    }

    return (
        <div className="app">
            {props.ual?.activeUser ?
                <>
                    <p>
                        <div>{props.ual.activeUser.accountName}</div>
                        <div><button onClick={() => logout()}>Logout</button></div>
                    </p>
                    <p>
                        <button onClick={() => verifyTransaction()}>Verify</button>
                    </p>
                    {loggedIn &&
                        <p>
                            <h1>Verified</h1>
                        </p>
                    }
                </>
            :
                <button onClick={() => login()}>Login</button>
            }
        </div>
    );
}

export default withUAL(App);
